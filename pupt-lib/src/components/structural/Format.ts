import { z } from 'zod';
import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';

export const formatSchema = z.object({
  type: z.enum(['json', 'markdown', 'xml', 'text', 'code']),
  language: z.string().optional(),
}).passthrough();

type FormatProps = z.infer<typeof formatSchema> & { children?: PuptNode };

export class Format extends Component<FormatProps> {
  static schema = formatSchema;

  render({ type, language, children }: FormatProps, _context: RenderContext): PuptNode {
    const formatDescription = language ? `${type} (${language})` : type;

    const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
    if (hasChildren) {
      return [`Output format: ${formatDescription}\n`, children];
    }

    return `Output format: ${formatDescription}`;
  }
}
