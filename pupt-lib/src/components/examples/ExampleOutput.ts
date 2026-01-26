import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';

interface ExampleOutputProps {
  children: PuptNode;
}

export class ExampleOutput extends Component<ExampleOutputProps> {
  render({ children }: ExampleOutputProps, _context: RenderContext): PuptNode {
    return ['<output>\n', children, '\n</output>'];
  }
}
