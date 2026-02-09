import { z } from 'zod';
import { Component } from 'pupt-lib';
import type { PuptNode, RenderContext } from 'pupt-lib';

// Browser-safe detection
const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';

export const fileSchema = z.object({
  path: z.string(),
  language: z.string().optional(),
  encoding: z.string().optional(),
}).passthrough();

type FileProps = z.infer<typeof fileSchema> & { encoding?: BufferEncoding };

// Map common file extensions to language identifiers
const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.json': 'json',
  '.md': 'markdown',
  '.py': 'python',
  '.rb': 'ruby',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.c': 'c',
  '.cpp': 'cpp',
  '.h': 'c',
  '.hpp': 'cpp',
  '.css': 'css',
  '.scss': 'scss',
  '.html': 'html',
  '.xml': 'xml',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.sh': 'bash',
  '.sql': 'sql',
};

// Cache for Node.js modules (lazy loaded)
let fsModule: typeof import('fs') | null = null;
let pathModule: typeof import('path') | null = null;

/**
 * Get the file extension from a path (browser-safe fallback)
 */
function getExtname(filePath: string): string {
  if (pathModule) {
    return pathModule.extname(filePath);
  }
  // Simple fallback for browsers
  const lastDot = filePath.lastIndexOf('.');
  return lastDot >= 0 ? filePath.slice(lastDot) : '';
}

/**
 * Get the base filename from a path (browser-safe fallback)
 */
function getBasename(filePath: string): string {
  if (pathModule) {
    return pathModule.basename(filePath);
  }
  // Simple fallback for browsers
  const lastSlash = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
  return lastSlash >= 0 ? filePath.slice(lastSlash + 1) : filePath;
}

export class File extends Component<FileProps> {
  static schema = fileSchema;
  static hoistName = true;

  render({ path, language, encoding = 'utf-8' }: FileProps, _resolvedValue: void, _context: RenderContext): PuptNode {
    // File reading is not available in browsers
    if (isBrowser) {
      return `[Error: File component is not available in browser environments. Path: ${path}]`;
    }

    try {
      // Lazy load Node.js modules
      if (!fsModule) {
        // Use require for synchronous loading (needed for render which is sync)
        // The dynamic import pattern with await doesn't work for sync render()
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        fsModule = require('fs');
      }
      if (!pathModule) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        pathModule = require('path');
      }

      const content = fsModule!.readFileSync(path, { encoding });
      const ext = getExtname(path);
      const lang = language ?? EXTENSION_TO_LANGUAGE[ext] ?? '';
      const filename = getBasename(path);

      return [
        `<!-- ${filename} -->\n`,
        `\`\`\`${lang}\n`,
        content,
        '\n```',
      ];
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return `[Error reading file: ${message}]`;
    }
  }
}
