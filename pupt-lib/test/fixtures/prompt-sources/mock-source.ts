import { readdir, readFile } from 'fs/promises';
import { join,resolve } from 'path';

import type { DiscoveredPromptFile,PromptSource } from '../../../src/types/prompt-source';

export default class MockSource implements PromptSource {
  private config: { path: string };

  constructor(config: { path: string }) {
    this.config = config;
  }

  async getPrompts(): Promise<DiscoveredPromptFile[]> {
    const resolvedPath = resolve(this.config.path);

    // Check for prompts/ subdirectory
    let scanDir = resolvedPath;
    const entries = await readdir(resolvedPath);
    const hasPromptFiles = entries.some(e => e.endsWith('.prompt'));

    if (!hasPromptFiles) {
      const promptsSubdir = join(resolvedPath, 'prompts');
      try {
        await readdir(promptsSubdir);
        scanDir = promptsSubdir;
      } catch {
        return [];
      }
    }

    const dirEntries = await readdir(scanDir);
    const promptFiles = dirEntries.filter(e => e.endsWith('.prompt'));

    const results: DiscoveredPromptFile[] = [];
    for (const filename of promptFiles) {
      const filePath = join(scanDir, filename);
      const content = await readFile(filePath, 'utf-8');
      results.push({ filename, content });
    }

    return results;
  }
}
