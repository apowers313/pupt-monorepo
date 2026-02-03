import { z } from 'zod';
import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';

export const dataSchema = z.object({
  name: z.string(),
  format: z.enum(['json', 'xml', 'text', 'csv']).optional(),
}).passthrough();

type DataProps = z.infer<typeof dataSchema> & { children: PuptNode };

export class Data extends Component<DataProps> {
  static schema = dataSchema;

  render({ name, format = 'text', children }: DataProps, _resolvedValue: void, _context: RenderContext): PuptNode {
    return [
      `<data name="${name}" format="${format}">\n`,
      children,
      '\n</data>\n',
    ];
  }
}
