import { z } from 'zod';
import { Component } from 'pupt-lib';
import type { PuptNode, RenderContext } from 'pupt-lib';

export const codeSchema = z.object({
  language: z.string().optional(),
  filename: z.string().optional(),
}).passthrough();

type CodeProps = z.infer<typeof codeSchema> & { children: PuptNode };

export class Code extends Component<CodeProps> {
  static schema = codeSchema;

  render({ language = '', filename, children }: CodeProps, _resolvedValue: void, _context: RenderContext): PuptNode {
    const parts: PuptNode[] = [];

    if (filename) {
      parts.push(`<!-- ${filename} -->\n`);
    }

    parts.push(`\`\`\`${language}\n`);
    parts.push(children);
    parts.push('\n```');

    return parts;
  }
}
