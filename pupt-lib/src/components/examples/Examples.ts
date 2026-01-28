import { z } from 'zod';
import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';

export const examplesSchema = z.object({}).passthrough();

type ExamplesProps = z.infer<typeof examplesSchema> & { children: PuptNode };

export class Examples extends Component<ExamplesProps> {
  static schema = examplesSchema;

  render({ children }: ExamplesProps, _context: RenderContext): PuptNode {
    return ['<examples>\n', children, '</examples>\n'];
  }
}
