import { z } from 'zod';
import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';

export const xmlSchema = z.object({
  root: z.string().optional(),
}).passthrough();

type XmlProps = z.infer<typeof xmlSchema> & { children: PuptNode };

export class Xml extends Component<XmlProps> {
  static schema = xmlSchema;

  render({ root = 'data', children }: XmlProps, _context: RenderContext): PuptNode {
    return [
      '```xml\n',
      `<${root}>\n`,
      children,
      `\n</${root}>\n`,
      '```',
    ];
  }
}
