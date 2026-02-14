import path from 'node:path';
import fs from 'node:fs';
import { findProjectRoot } from './project-root.js';

export interface PromptDirResolverOptions {
  configPromptDirs: string[];
  cliPromptDirs?: string[];
  startDir?: string;
}

const LOCAL_PROMPTS_DIR = '.prompts';

/**
 * Find the local .prompts/ directory at the project root, if it exists.
 */
export async function findLocalPromptsDir(startDir?: string): Promise<string | null> {
  const root = findProjectRoot(startDir ?? process.cwd());
  if (!root) return null;

  const localDir = path.join(root, LOCAL_PROMPTS_DIR);
  try {
    const stat = fs.statSync(localDir);
    if (stat.isDirectory()) {
      return localDir;
    }
  } catch {
    // .prompts/ doesn't exist
  }
  return null;
}

/**
 * Compute the effective promptDirs by merging:
 *   1. CLI --prompt-dir paths (highest priority)
 *   2. Auto-discovered {projectRoot}/.prompts/ (if it exists)
 *   3. Global config promptDirs
 *
 * Duplicates are removed (first occurrence wins).
 */
export async function resolvePromptDirs(options: PromptDirResolverOptions): Promise<string[]> {
  const { configPromptDirs, cliPromptDirs, startDir } = options;
  const seen = new Set<string>();
  const result: string[] = [];

  function add(dir: string) {
    const resolved = path.resolve(dir);
    if (!seen.has(resolved)) {
      seen.add(resolved);
      result.push(resolved);
    }
  }

  // 1. CLI dirs first
  if (cliPromptDirs) {
    for (const dir of cliPromptDirs) {
      add(dir);
    }
  }

  // 2. Auto-discovered local .prompts/
  const localDir = await findLocalPromptsDir(startDir);
  if (localDir) {
    add(localDir);
  }

  // 3. Global config dirs
  for (const dir of configPromptDirs) {
    add(dir);
  }

  return result;
}
