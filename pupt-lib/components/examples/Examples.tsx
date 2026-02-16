import { z } from 'zod';
import { Component } from 'pupt-lib';
import type { PuptNode, RenderContext } from 'pupt-lib';

export const examplesSchema = z.object({}).passthrough();

type ExamplesProps = z.infer<typeof examplesSchema> & { children: PuptNode };

export class Examples extends Component<ExamplesProps> {
  static schema = examplesSchema;

  render({ children }: ExamplesProps, _resolvedValue: void, _context: RenderContext): PuptNode {
    return ['<examples>\n', children, '</examples>\n'];
  }
}
