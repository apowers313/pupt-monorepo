import type { PromptSource, DiscoveredPromptFile } from '../../types/prompt-source';

/**
 * Discovers .prompt files from a local filesystem directory.
 *
 * Accepts either a direct path to a directory containing .prompt files,
 * or a package root path that has a `prompts/` subdirectory.
 */
export class LocalPromptSource implements PromptSource {
  private dirPath: string;

  constructor(dirPath: string) {
    this.dirPath = dirPath;
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

    // Determine the actual directory to scan:
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

    // Read all .prompt files from the scan directory
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
