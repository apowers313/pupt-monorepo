import { z } from 'zod';
import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';

export const sectionSchema = z.object({
  name: z.string().optional(),
  delimiter: z.enum(['xml', 'markdown', 'none']).optional(),
}).passthrough();

type SectionProps = z.infer<typeof sectionSchema> & { children: PuptNode };

export class Section extends Component<SectionProps> {
  static schema = sectionSchema;

  render({ name, delimiter, children }: SectionProps, _context: RenderContext): PuptNode {
    const effectiveDelimiter = delimiter ?? (name ? 'xml' : 'none');
    const childContent = Array.isArray(children) ? children : children;
    // Default tag name to 'section' if not provided
    const tagName = name ?? 'section';

    switch (effectiveDelimiter) {
      case 'xml':
        return [`<${tagName}>\n`, childContent, `\n</${tagName}>`];
      case 'markdown':
        return [`## ${tagName}\n\n`, childContent];
      case 'none':
        return childContent;
    }
  }
}
