import path from 'node:path';

import type { ModuleEntry } from '@pupt/lib';

import { getDataDir } from '../config/global-paths.js';
import type { Config, LibraryEntry } from '../types/config.js';
import { findLocalPromptsDir } from '../utils/prompt-dir-resolver.js';
import { scanLocalPromptDir } from './pupt-prompt-source.js';

export interface BuildModuleEntriesOptions {
  config: Config;
  /** CLI --prompt-dir overrides (highest priority) */
  cliPromptDirs?: string[];
  /** Starting directory for auto-discovering .prompts/ */
  startDir?: string;
}

/**
 * Build a ModuleEntry[] from pupt's existing config fields.
 *
 * Priority order:
 *   1. CLI --prompt-dir overrides
 *   2. Auto-discovered {projectRoot}/.prompts/
 *   3. Config promptDirs (local directories)
 *   4. Config libraries → ResolvedModuleEntry
 */
export async function buildModuleEntries(options: BuildModuleEntriesOptions): Promise<ModuleEntry[]> {
  const { config, cliPromptDirs, startDir } = options;
  const seen = new Set<string>();
  const entries: ModuleEntry[] = [];

  async function addLocalDir(dir: string) {
    const resolved = path.resolve(dir);
    if (!seen.has(resolved)) {
      seen.add(resolved);
      const sources = await scanLocalPromptDir(resolved);
      entries.push(...sources);
    }
  }

  // 1. CLI --prompt-dir overrides (highest priority)
  if (cliPromptDirs) {
    for (const dir of cliPromptDirs) {await addLocalDir(dir);}
  }

  // 2. Auto-discovered {projectRoot}/.prompts/
  const localDir = await findLocalPromptsDir(startDir);
  if (localDir) {await addLocalDir(localDir);}

  // 3. Config promptDirs (local directories)
  for (const dir of config.promptDirs) {await addLocalDir(dir);}

  // 4. Libraries → scan each library's promptDirs for .prompt files
  if (config.libraries) {
    const dataDir = getDataDir();
    for (const lib of config.libraries) {
      const libDirs = getLibraryPromptDirs(lib, dataDir);
      for (const dir of libDirs) {await addLocalDir(dir);}
    }
  }

  return entries;
}

/**
 * Get the absolute prompt directories for a library entry.
 */
function getLibraryPromptDirs(lib: LibraryEntry, dataDir: string): string[] {
  let basePath: string;
  if (lib.type === 'git') {
    basePath = path.join(dataDir, 'libraries', lib.name);
  } else {
    // npm: resolved from the local packages directory
    basePath = path.join(dataDir, 'packages', 'node_modules', lib.name);
  }

  if (lib.promptDirs && lib.promptDirs.length > 0) {
    return lib.promptDirs.map(dir => path.join(basePath, dir));
  }

  // Default: scan the library root
  return [basePath];
}
