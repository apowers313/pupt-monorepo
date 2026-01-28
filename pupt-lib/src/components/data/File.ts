import { z } from 'zod';
import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';
import { readFileSync } from 'fs';
import { extname, basename } from 'path';

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

export class File extends Component<FileProps> {
  static schema = fileSchema;

  render({ path, language, encoding = 'utf-8' }: FileProps, _context: RenderContext): PuptNode {
    try {
      const content = readFileSync(path, { encoding });
      const ext = extname(path);
      const lang = language ?? EXTENSION_TO_LANGUAGE[ext] ?? '';
      const filename = basename(path);

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
