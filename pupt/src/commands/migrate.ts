import fs from 'fs-extra';
import path from 'node:path';
import { convertPrompt } from '../services/prompt-converter.js';

interface OldPromptFile {
  path: string;
  relativePath: string;
  dir: string;
}

/**
 * Scan directories for old format (.md) prompt files.
 */
export async function findOldFormatPrompts(promptDirs: string[]): Promise<OldPromptFile[]> {
  const oldPrompts: OldPromptFile[] = [];

  for (const dir of promptDirs) {
    if (!await fs.pathExists(dir)) continue;

    const files = await scanDirectory(dir);
    for (const file of files) {
      if (file.endsWith('.md')) {
        // Check if it looks like a prompt file (has frontmatter or handlebars)
        const content = await fs.readFile(file, 'utf-8');
        if (isLikelyPromptFile(content)) {
          oldPrompts.push({
            path: file,
            relativePath: path.relative(dir, file),
            dir,
          });
        }
      }
    }
  }

  return oldPrompts;
}

/**
 * Recursively scan a directory for files.
 */
async function scanDirectory(dir: string): Promise<string[]> {
  const results: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const subFiles = await scanDirectory(fullPath);
      results.push(...subFiles);
    } else if (entry.isFile()) {
      results.push(fullPath);
    }
  }

  return results;
}

/**
 * Check if a file content looks like an old-format prompt.
 */
function isLikelyPromptFile(content: string): boolean {
  // Has YAML frontmatter
  if (content.startsWith('---')) return true;

  // Has Handlebars expressions
  if (/\{\{[^}]+\}\}/.test(content)) return true;

  // Has typical prompt section headers
  if (/^\*\*(Role|Task|Context|Objective|Requirements?)\*\*/m.test(content)) return true;

  return false;
}

/**
 * Migrate a single prompt file from .md to .prompt format.
 */
export async function migratePromptFile(
  oldPath: string,
  options: { backup?: boolean; dryRun?: boolean } = {}
): Promise<{ newPath: string; success: boolean; error?: string }> {
  const newPath = oldPath.replace(/\.md$/, '.prompt');

  try {
    const content = await fs.readFile(oldPath, 'utf-8');
    const result = convertPrompt(content, oldPath);

    if (options.dryRun) {
      return { newPath, success: true };
    }

    // Write the new file
    await fs.writeFile(newPath, result.output, 'utf-8');

    // Backup or remove the old file
    if (options.backup) {
      await fs.rename(oldPath, oldPath + '.bak');
    } else {
      await fs.remove(oldPath);
    }

    return { newPath, success: true };
  } catch (error) {
    return {
      newPath,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

