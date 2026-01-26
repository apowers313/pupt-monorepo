import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';

interface UsesProps {
  prompt: string;
  as?: string;
  children?: PuptNode;
}

export class Uses extends Component<UsesProps> {
  render(_props: UsesProps, _context: RenderContext): PuptNode {
    // Uses is a dependency declaration - parsed but not rendered
    // The dependency resolution happens at a higher level
    return null;
  }
}
