import type { PromptSource, DiscoveredPromptFile } from '../../types/prompt-source';

/** Options for LocalPromptSource */
export interface LocalPromptSourceOptions {
  /** Explicit prompt directories to scan (relative to dirPath). Overrides default discovery. */
  promptDirs?: string[];
}

/**
 * Discovers .prompt files from a local filesystem directory.
 *
 * Accepts either a direct path to a directory containing .prompt files,
 * or a package root path that has a `prompts/` subdirectory.
 *
 * When `promptDirs` is provided, scans those specific subdirectories
 * instead of using the default discovery heuristic.
 */
export class LocalPromptSource implements PromptSource {
  private dirPath: string;
  private promptDirs?: string[];

  constructor(dirPath: string, options?: LocalPromptSourceOptions) {
    this.dirPath = dirPath;
    this.promptDirs = options?.promptDirs;
  }

  async getPrompts(): Promise<DiscoveredPromptFile[]> {
    const fs = await import('fs/promises');
    const path = await import('path');

    const resolvedPath = path.resolve(this.dirPath);

    // Check if the path itself exists
    try {
      await fs.access(resolvedPath);
    } catch {
      throw new Error(`Directory not found: ${resolvedPath}`);
    }

    // If explicit promptDirs are provided, scan each one
    if (this.promptDirs && this.promptDirs.length > 0) {
      return this.scanPromptDirs(resolvedPath, this.promptDirs);
    }

    // Default discovery heuristic:
    // 1. If the path itself contains .prompt files, use it directly
    // 2. If it has a prompts/ subdirectory, use that
    let scanDir = resolvedPath;

    const entries = await fs.readdir(resolvedPath);
    const hasPromptFiles = entries.some(e => e.endsWith('.prompt'));

    if (!hasPromptFiles) {
      const promptsSubdir = path.join(resolvedPath, 'prompts');
      try {
        await fs.access(promptsSubdir);
        scanDir = promptsSubdir;
      } catch {
        // No prompts/ subdirectory and no .prompt files in root
        return [];
      }
    }

    return this.scanDirectory(scanDir);
  }

  /**
   * Scan explicit prompt directories relative to the base path.
   */
  private async scanPromptDirs(basePath: string, promptDirs: string[]): Promise<DiscoveredPromptFile[]> {
    const path = await import('path');
    const fs = await import('fs/promises');
    const results: DiscoveredPromptFile[] = [];

    for (const dir of promptDirs) {
      const fullDir = path.join(basePath, dir);
      try {
        await fs.access(fullDir);
        const dirResults = await this.scanDirectory(fullDir);
        results.push(...dirResults);
      } catch {
        // Skip directories that don't exist
      }
    }

    return results;
  }

  /**
   * Scan a single directory for .prompt files.
   */
  private async scanDirectory(scanDir: string): Promise<DiscoveredPromptFile[]> {
    const fs = await import('fs/promises');
    const path = await import('path');

    const dirEntries = await fs.readdir(scanDir);
    const promptFiles = dirEntries.filter(e => e.endsWith('.prompt'));

    const results: DiscoveredPromptFile[] = [];
    for (const filename of promptFiles) {
      const filePath = path.join(scanDir, filename);
      const content = await fs.readFile(filePath, 'utf-8');
      results.push({ filename, content });
    }

    return results;
  }
}
