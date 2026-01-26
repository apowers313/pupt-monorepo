import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';
import { ExampleInput } from './ExampleInput';
import { ExampleOutput } from './ExampleOutput';

interface ExampleProps {
  children: PuptNode;
}

export class Example extends Component<ExampleProps> {
  static Input = ExampleInput;
  static Output = ExampleOutput;

  render({ children }: ExampleProps, _context: RenderContext): PuptNode {
    return ['<example>\n', children, '\n</example>\n'];
  }
}
