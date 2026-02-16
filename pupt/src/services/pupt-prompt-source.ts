import type { PromptSource, DiscoveredPromptFile } from 'pupt-lib';
import fs from 'fs-extra';
import path from 'node:path';

/**
 * A PromptSource wrapping a single preprocessed file.
 * Using one source per file gives per-file error isolation through
 * pupt-lib's per-module error handling in Pupt.discoverPrompts().
 *
 * The `name` property provides a human-readable identifier used by
 * pupt-lib for error messages (via getEntryDisplayName).
 */
class SingleFilePromptSource implements PromptSource {
  readonly name: string;
  constructor(
    private file: DiscoveredPromptFile,
    originalFilename: string,
  ) {
    this.name = originalFilename;
  }
  async getPrompts(): Promise<DiscoveredPromptFile[]> {
    return [this.file];
  }
}

/**
 * Recursively scan a directory for .prompt files and return
 * one PromptSource per file.
 *
 * This handles several gaps in pupt-lib's LocalPromptSource:
 * 1. Recursive subdirectory scanning
 * 2. JSX comment stripping at top of file
 * 3. Neutralizing {inputs.xxx} references (so they don't throw ReferenceError)
 * 4. Per-file error isolation (each file is its own module entry)
 *
 * Files are returned as .prompt so pupt-lib handles all preprocessing
 * (imports, fragment wrapping, Babel transform, fragment unwrapping).
 */
export async function scanLocalPromptDir(dirPath: string): Promise<PromptSource[]> {
  const resolvedPath = path.resolve(dirPath);
  if (!await fs.pathExists(resolvedPath)) return [];

  const files: { fullPath: string; filename: string }[] = [];
  await scanRecursive(resolvedPath, files);

  const sources: PromptSource[] = [];
  for (const file of files) {
    let content = await fs.readFile(file.fullPath, 'utf-8');

    // Strip JSX comments at top of file (e.g., {/* Converted from test.md */})
    content = content.trim().replace(/^\{\/\*[\s\S]*?\*\/\}\s*/g, '');

    // Neutralize {inputs.xxx} references to prevent ReferenceError during compilation.
    // Input discovery works through <Ask> components, not these expressions.
    // Actual input values are substituted by pupt-lib's render() at render time.
    content = neutralizeInputRefs(content);

    sources.push(new SingleFilePromptSource({ filename: file.filename, content }, file.filename));
  }

  return sources;
}

async function scanRecursive(
  dir: string,
  results: { fullPath: string; filename: string }[],
): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await scanRecursive(fullPath, results);
    } else if (entry.isFile() && entry.name.endsWith('.prompt')) {
      results.push({ fullPath, filename: entry.name });
    }
  }
}

/**
 * Replace {inputs.xxx} expressions with {""} to prevent ReferenceError
 * during compilation. The <Ask> components remain intact for input discovery.
 */
function neutralizeInputRefs(content: string): string {
  return content.replace(/\{inputs\.\w+\}/g, '{""}');
}
