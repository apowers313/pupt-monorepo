import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';

interface ExamplesProps {
  children: PuptNode;
}

export class Examples extends Component<ExamplesProps> {
  render({ children }: ExamplesProps, _context: RenderContext): PuptNode {
    return ['<examples>\n', children, '</examples>\n'];
  }
}
