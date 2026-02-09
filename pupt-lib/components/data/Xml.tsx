import { z } from 'zod';
import { Component } from 'pupt-lib';
import type { PuptNode, RenderContext } from 'pupt-lib';

export const xmlSchema = z.object({
  root: z.string().optional(),
}).passthrough();

type XmlProps = z.infer<typeof xmlSchema> & { children: PuptNode };

export class Xml extends Component<XmlProps> {
  static schema = xmlSchema;

  render({ root = 'data', children }: XmlProps, _resolvedValue: void, _context: RenderContext): PuptNode {
    return [
      '```xml\n',
      `<${root}>\n`,
      children,
      `\n</${root}>\n`,
      '```',
    ];
  }
}
