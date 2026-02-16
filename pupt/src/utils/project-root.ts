import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Project markers used to detect project root directories.
 * Listed roughly in order of specificity/reliability.
 * Note: '.git' is handled specially to support worktrees.
 */
export const PROJECT_MARKERS = [
  // Version Control (most reliable indicators)
  // '.git' is handled specially - see resolveGitWorktreeRoot()
  '.hg',
  '.svn',

  // JavaScript/TypeScript
  'package.json',
  'deno.json',
  'deno.jsonc',

  // Python
  'pyproject.toml',
  'setup.py',
  'Pipfile',
  'setup.cfg',
  'poetry.lock',

  // Rust
  'Cargo.toml',

  // Go
  'go.mod',

  // Java/JVM
  'pom.xml',
  'build.gradle',
  'build.gradle.kts',
  'build.sbt',
  'project.clj', // Clojure/Leiningen

  // Ruby
  'Gemfile',

  // PHP
  'composer.json',

  // .NET (exact files, not globs)
  'nuget.config',
  'packages.config',

  // Elixir/Erlang
  'mix.exs',
  'rebar.config',

  // Swift/iOS/macOS
  'Package.swift',

  // Haskell
  'stack.yaml',
  'cabal.project',

  // Scala
  'build.sc', // Mill

  // Build systems
  'Makefile',
  'CMakeLists.txt',
  'meson.build',
  'BUILD',
  'BUILD.bazel',
  'WORKSPACE',
  'WORKSPACE.bazel',
  'Justfile',
  'Taskfile.yml',
  'Taskfile.yaml',

  // Other common project indicators
  'Dockerfile',
  'docker-compose.yml',
  'docker-compose.yaml',
  '.editorconfig',
  '.prettierrc',
  '.eslintrc.json',
  '.eslintrc.js',
  '.eslintrc.cjs',
  'tsconfig.json',
  'jsconfig.json',
] as const;

/**
 * Glob-style patterns for .NET projects.
 * These require directory scanning rather than exact file checks.
 */
const PROJECT_GLOB_PATTERNS = [
  '*.csproj',
  '*.fsproj',
  '*.vbproj',
  '*.sln',
] as const;

// Cache for project root lookups to avoid repeated filesystem traversal
const projectRootCache = new Map<string, string | null>();

/**
 * Resolve the main worktree root from a git directory.
 *
 * In a standard git repo, .git is a directory.
 * In a linked worktree, .git is a file containing "gitdir: /path/to/main/.git/worktrees/<name>"
 *
 * This function returns the root of the MAIN worktree, not the linked one.
 *
 * @param dir - Directory that may contain .git
 * @returns The main worktree root, or null if not a git repo
 */
function resolveGitWorktreeRoot(dir: string): string | null {
  const gitPath = path.join(dir, '.git');

  try {
    const stat = fs.statSync(gitPath);

    if (stat.isDirectory()) {
      // Standard git repo - this is the main worktree
      return dir;
    }

    if (stat.isFile()) {
      // This is a linked worktree - .git is a file with gitdir pointer
      const content = fs.readFileSync(gitPath, 'utf-8').trim();

      // Parse "gitdir: /path/to/main/.git/worktrees/<worktree-name>"
      const match = content.match(/^gitdir:\s*(.+)$/);
      if (match) {
        const gitdir = match[1];

        // The gitdir points to .git/worktrees/<name> in the main repo
        // We need to go up to find the main repo root
        // e.g., /path/to/main/.git/worktrees/feature -> /path/to/main
        if (gitdir.includes('/worktrees/') || gitdir.includes('\\worktrees\\')) {
          // Go up from .git/worktrees/<name> to the main repo root
          // .git/worktrees/<name> -> .git -> repo root
          const mainGitDir = path.dirname(path.dirname(gitdir));
          const mainRoot = path.dirname(mainGitDir);

          // Verify this is actually a git directory
          if (fs.existsSync(mainGitDir) && fs.statSync(mainGitDir).isDirectory()) {
            return mainRoot;
          }
        }
      }
    }
  } catch {
    // .git doesn't exist or not readable
  }

  return null;
}

/**
 * Check if a directory contains any files matching glob-style patterns.
 * Only handles simple *.ext patterns, not full glob syntax.
 */
function hasMatchingFiles(dir: string, patterns: readonly string[]): boolean {
  try {
    const files = fs.readdirSync(dir);
    for (const pattern of patterns) {
      if (pattern.startsWith('*.')) {
        const ext = pattern.slice(1); // Get ".ext"
        if (files.some(f => f.endsWith(ext))) {
          return true;
        }
      }
    }
  } catch {
    // Directory not readable
  }
  return false;
}

/**
 * Check if a directory contains any project marker.
 */
function hasProjectMarker(dir: string): boolean {
  // Check exact file/directory markers
  for (const marker of PROJECT_MARKERS) {
    const markerPath = path.join(dir, marker);
    if (fs.existsSync(markerPath)) {
      return true;
    }
  }

  // Check glob patterns for .NET projects
  if (hasMatchingFiles(dir, PROJECT_GLOB_PATTERNS)) {
    return true;
  }

  return false;
}

/**
 * Find the project root by searching upward from startDir for project markers.
 * Stops at the home directory or filesystem root.
 *
 * For git repositories with worktrees, this returns the MAIN worktree root,
 * allowing all worktrees to share the same project root.
 *
 * @param startDir - Directory to start searching from
 * @returns The project root directory path, or null if not found
 */
export function findProjectRoot(startDir: string): string | null {
  // Normalize the start directory
  const normalizedStart = path.resolve(startDir);

  // Check cache first
  const cached = projectRootCache.get(normalizedStart);
  if (cached !== undefined) {
    return cached;
  }

  const homeDir = os.homedir();
  let currentDir = normalizedStart;

  while (true) {
    // First, check for git (with worktree support)
    // This takes priority to ensure worktrees resolve to main repo
    const gitRoot = resolveGitWorktreeRoot(currentDir);
    if (gitRoot !== null) {
      projectRootCache.set(normalizedStart, gitRoot);
      return gitRoot;
    }

    // Check other project markers
    if (hasProjectMarker(currentDir)) {
      projectRootCache.set(normalizedStart, currentDir);
      return currentDir;
    }

    // Stop at home directory
    if (currentDir === homeDir) {
      break;
    }

    // Move to parent directory
    const parentDir = path.dirname(currentDir);

    // Stop at filesystem root
    if (parentDir === currentDir) {
      break;
    }

    currentDir = parentDir;
  }

  // No project root found
  projectRootCache.set(normalizedStart, null);
  return null;
}

/**
 * Clear the project root cache. Useful for testing.
 */
export function clearProjectRootCache(): void {
  projectRootCache.clear();
}
