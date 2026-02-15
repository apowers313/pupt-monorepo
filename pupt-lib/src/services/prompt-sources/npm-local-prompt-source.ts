import type { PromptSource, DiscoveredPromptFile } from '../../types/prompt-source';

/**
 * Discovers .prompt files from locally installed npm packages.
 *
 * Resolves the package to its location in node_modules/,
 * then looks for a `prompts/` subdirectory containing .prompt files.
 */
export class NpmLocalPromptSource implements PromptSource {
  private packageName: string;

  constructor(packageName: string) {
    this.packageName = packageName;
  }

  async getPrompts(): Promise<DiscoveredPromptFile[]> {
    const packageDir = await this.resolvePackagePath(this.packageName);

    const fs = await import('fs/promises');
    const path = await import('path');

    const promptsDir = path.join(packageDir, 'prompts');

    // Check if the prompts/ directory exists
    try {
      await fs.access(promptsDir);
    } catch {
      // No prompts/ directory — package doesn't ship prompt files
      return [];
    }

    // Read all .prompt files
    const entries = await fs.readdir(promptsDir);
    const promptFiles = entries.filter(e => e.endsWith('.prompt'));

    const results: DiscoveredPromptFile[] = [];
    for (const filename of promptFiles) {
      const filePath = path.join(promptsDir, filename);
      const content = await fs.readFile(filePath, 'utf-8');
      results.push({ filename, content });
    }

    return results;
  }

  /**
   * Resolve a bare package name to its directory path in node_modules.
   * Uses import.meta.resolve() when available, with createRequire fallback.
   */
  async resolvePackagePath(packageName: string): Promise<string> {
    const path = await import('path');

    // Try to resolve the package's package.json to find its directory
    const pkgJsonSpecifier = `${packageName}/package.json`;

    if (typeof import.meta.resolve === 'function') {
      try {
        const resolved = import.meta.resolve(pkgJsonSpecifier);
        const { fileURLToPath } = await import('url');
        const pkgJsonPath = fileURLToPath(resolved);
        return path.dirname(pkgJsonPath);
      } catch {
        // Fall through to createRequire fallback
      }
    }

    // Fallback for environments where import.meta.resolve is unavailable
    try {
      const { createRequire } = await import('module');
      const esmRequire = createRequire(import.meta.url);
      const pkgJsonPath = esmRequire.resolve(pkgJsonSpecifier);
      return path.dirname(pkgJsonPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Cannot resolve npm package "${packageName}": ${message}`,
      );
    }
  }
}
