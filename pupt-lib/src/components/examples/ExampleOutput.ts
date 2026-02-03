import { z } from 'zod';
import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';

export const exampleOutputSchema = z.object({}).passthrough();

type ExampleOutputProps = z.infer<typeof exampleOutputSchema> & { children: PuptNode };

export class ExampleOutput extends Component<ExampleOutputProps> {
  static schema = exampleOutputSchema;

  render({ children }: ExampleOutputProps, _resolvedValue: void, _context: RenderContext): PuptNode {
    return ['<output>\n', children, '\n</output>'];
  }
}
