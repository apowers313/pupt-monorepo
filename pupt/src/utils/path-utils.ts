/**
 * Utilities for converting paths to portable format for config files.
 *
 * When saving configs, absolute paths should be converted to portable formats:
 * - Paths under project root → ${projectRoot}/...
 * - Paths under home directory → ~/...
 * - Already relative paths → kept as-is
 * - Other absolute paths → kept as-is with warning
 */

import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { findProjectRoot } from './project-root.js';
import { logger } from './logger.js';

/**
 * Resolve symlinks in a path, even if the leaf segments don't exist.
 * Walks up to the nearest existing ancestor, resolves it, then re-appends
 * the non-existent tail. This handles macOS /var -> /private/var symlink
 * differences when the target path (e.g. a prompt directory) hasn't been
 * created yet.
 */
function safeRealpath(p: string): string {
  try {
    return fs.realpathSync(p);
  } catch {
    const parent = path.dirname(p);
    if (parent === p) {
      // Reached filesystem root — nothing more to resolve
      return p;
    }
    return path.join(safeRealpath(parent), path.basename(p));
  }
}

export interface ContractPathsOptions {
  /** Directory to resolve relative paths from (typically config file location) */
  configDir?: string;
  /** Whether to warn about non-portable absolute paths */
  warnOnAbsolute?: boolean;
}

export interface ContractPathsResult {
  /** The contracted path */
  path: string;
  /** Whether a warning was issued */
  warned: boolean;
}

/**
 * Contract a single path to a portable format.
 *
 * Priority:
 * 1. Already relative paths → keep as-is
 * 2. Paths under project root → ${projectRoot}/...
 * 3. Paths under home directory → ~/...
 * 4. Other absolute paths → keep as-is (with optional warning)
 */
export function contractPath(
  filepath: string,
  options: ContractPathsOptions = {}
): ContractPathsResult {
  const { configDir = process.cwd(), warnOnAbsolute = true } = options;

  // Already relative path - keep as-is
  if (!path.isAbsolute(filepath)) {
    return { path: filepath, warned: false };
  }

  // Already uses ${projectRoot} or ~ - keep as-is
  if (filepath.includes('${projectRoot}') || filepath.startsWith('~/')) {
    return { path: filepath, warned: false };
  }

  const homeDir = os.homedir();
  const projectRoot = findProjectRoot(configDir);

  // Resolve symlinks for comparison (handles macOS /var -> /private/var)
  const resolvedPath = safeRealpath(filepath);

  // Check if path is under project root (prefer this over home)
  if (projectRoot) {
    const resolvedProjectRoot = safeRealpath(projectRoot);
    if (resolvedPath.startsWith(resolvedProjectRoot + path.sep) || resolvedPath === resolvedProjectRoot) {
      const relativePath = path.relative(resolvedProjectRoot, resolvedPath);
      // Use forward slashes for cross-platform compatibility in config
      const portablePath = relativePath.split(path.sep).join('/');
      return {
        path: portablePath ? `\${projectRoot}/${portablePath}` : '${projectRoot}',
        warned: false
      };
    }
  }

  // Check if path is under home directory
  const resolvedHomeDir = safeRealpath(homeDir);
  if (resolvedPath.startsWith(resolvedHomeDir + path.sep) || resolvedPath === resolvedHomeDir) {
    const relativePath = path.relative(resolvedHomeDir, resolvedPath);
    // Use forward slashes for cross-platform compatibility
    const portablePath = relativePath.split(path.sep).join('/');
    return {
      path: portablePath ? `~/${portablePath}` : '~',
      warned: false
    };
  }

  // Absolute path outside project and home - keep as-is but warn
  if (warnOnAbsolute) {
    logger.warn(
      `Path "${filepath}" is absolute and outside the project root. ` +
      `This path will not be portable across machines. ` +
      `Consider using a relative path, ~/..., or \${projectRoot}/...`
    );
  }

  return { path: filepath, warned: true };
}

/**
 * Check if a path is absolute and could be made portable.
 * Used for warning users on config load.
 */
export function isNonPortableAbsolutePath(filepath: string, configDir?: string): boolean {
  // Not absolute - it's fine
  if (!path.isAbsolute(filepath)) {
    return false;
  }

  // Uses portable variables - it's fine
  if (filepath.includes('${projectRoot}') || filepath.startsWith('~/')) {
    return false;
  }

  const homeDir = os.homedir();
  const projectRoot = findProjectRoot(configDir || process.cwd());
  const resolvedPath = safeRealpath(filepath);

  // Check if it could be made portable
  if (projectRoot) {
    const resolvedProjectRoot = safeRealpath(projectRoot);
    if (resolvedPath.startsWith(resolvedProjectRoot + path.sep)) {
      return true; // Could use ${projectRoot}
    }
  }

  const resolvedHomeDir = safeRealpath(homeDir);
  if (resolvedPath.startsWith(resolvedHomeDir + path.sep)) {
    return true; // Could use ~/
  }

  // Absolute but can't be made portable - still flag it
  return true;
}

/**
 * Warn about non-portable paths in a config.
 * Call this when loading a config to alert users.
 */
export function warnAboutNonPortablePaths(
  paths: (string | undefined)[],
  configFilePath?: string
): void {
  const configDir = configFilePath ? path.dirname(configFilePath) : process.cwd();
  const nonPortable: string[] = [];

  for (const p of paths) {
    if (p && isNonPortableAbsolutePath(p, configDir)) {
      nonPortable.push(p);
    }
  }

  if (nonPortable.length > 0) {
    logger.warn(
      `Your config contains absolute paths that may not be portable:\n` +
      nonPortable.map(p => `  - ${p}`).join('\n') + '\n' +
      `These will be converted to portable format next time the config is saved.\n` +
      `To fix manually, use relative paths, ~/..., or \${projectRoot}/...`
    );
  }
}
