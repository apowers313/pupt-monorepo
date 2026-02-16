import type { PromptSource, DiscoveredPromptFile } from '../../types/prompt-source';

/** Options for NpmLocalPromptSource */
export interface NpmLocalPromptSourceOptions {
  /** Explicit prompt directories to scan (relative to package root). Overrides default 'prompts/'. */
  promptDirs?: string[];
}

/**
 * Discovers .prompt files from locally installed npm packages.
 *
 * Resolves the package to its location in node_modules/,
 * then looks for a `prompts/` subdirectory containing .prompt files.
 *
 * When `promptDirs` is provided, scans those specific subdirectories
 * instead of the default `prompts/`.
 */
export class NpmLocalPromptSource implements PromptSource {
  private packageName: string;
  private promptDirs?: string[];

  constructor(packageName: string, options?: NpmLocalPromptSourceOptions) {
    this.packageName = packageName;
    this.promptDirs = options?.promptDirs;
  }

  async getPrompts(): Promise<DiscoveredPromptFile[]> {
    const packageDir = await this.resolvePackagePath(this.packageName);

    const fs = await import('fs/promises');
    const path = await import('path');

    // If explicit promptDirs provided, scan each one
    const dirs = this.promptDirs ?? ['prompts'];
    const results: DiscoveredPromptFile[] = [];

    for (const dir of dirs) {
      const promptsDir = path.join(packageDir, dir);

      try {
        await fs.access(promptsDir);
      } catch {
        // Directory doesn't exist — skip
        continue;
      }

      const entries = await fs.readdir(promptsDir);
      const promptFiles = entries.filter(e => e.endsWith('.prompt'));

      for (const filename of promptFiles) {
        const filePath = path.join(promptsDir, filename);
        const content = await fs.readFile(filePath, 'utf-8');
        results.push({ filename, content });
      }
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
