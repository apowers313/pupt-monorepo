import { z } from 'zod';
import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';

export const exampleInputSchema = z.object({}).passthrough();

type ExampleInputProps = z.infer<typeof exampleInputSchema> & { children: PuptNode };

export class ExampleInput extends Component<ExampleInputProps> {
  static schema = exampleInputSchema;

  render({ children }: ExampleInputProps, _resolvedValue: void, _context: RenderContext): PuptNode {
    return ['<input>\n', children, '\n</input>'];
  }
}
