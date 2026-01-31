import { z } from 'zod';
import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';

export const formatSchema = z.object({
  type: z.enum(['json', 'markdown', 'xml', 'text', 'code']).optional(),
  language: z.string().optional(),
  delimiter: z.enum(['xml', 'markdown', 'none']).optional(),
}).passthrough();

type FormatProps = z.infer<typeof formatSchema> & { children?: PuptNode };

export class Format extends Component<FormatProps> {
  static schema = formatSchema;

  render({ type, language, delimiter = 'xml', children }: FormatProps, _context: RenderContext): PuptNode {
    const childContent = Array.isArray(children) ? children : children;

    // Build format prefix if type is specified
    let prefix = '';
    if (type) {
      const formatDescription = language ? `${type} (${language})` : type;
      prefix = `Output format: ${formatDescription}\n`;
    }

    const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);

    switch (delimiter) {
      case 'xml':
        if (hasChildren) {
          return ['<format>\n', prefix, childContent, '\n</format>'];
        }
        return ['<format>\n', prefix.trim(), '\n</format>'];
      case 'markdown':
        if (hasChildren) {
          return ['## format\n\n', prefix, childContent];
        }
        return ['## format\n\n', prefix.trim()];
      case 'none':
        if (hasChildren) {
          return [prefix, childContent];
        }
        return prefix.trim();
    }
  }
}
