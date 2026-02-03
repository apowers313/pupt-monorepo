import { z } from 'zod';
import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';
import { ExampleInput } from './ExampleInput';
import { ExampleOutput } from './ExampleOutput';

export const exampleSchema = z.object({}).passthrough();

type ExampleProps = z.infer<typeof exampleSchema> & { children: PuptNode };

export class Example extends Component<ExampleProps> {
  static Input = ExampleInput;
  static Output = ExampleOutput;
  static schema = exampleSchema;

  render({ children }: ExampleProps, _resolvedValue: void, _context: RenderContext): PuptNode {
    return ['<example>\n', children, '\n</example>\n'];
  }
}
