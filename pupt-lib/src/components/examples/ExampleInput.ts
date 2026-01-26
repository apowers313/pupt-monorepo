import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';

interface ExampleInputProps {
  children: PuptNode;
}

export class ExampleInput extends Component<ExampleInputProps> {
  render({ children }: ExampleInputProps, _context: RenderContext): PuptNode {
    return ['<input>\n', children, '\n</input>'];
  }
}
