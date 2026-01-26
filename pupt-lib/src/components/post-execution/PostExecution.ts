import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';

interface PostExecutionProps {
  children: PuptNode;
}

export class PostExecution extends Component<PostExecutionProps> {
  render({ children }: PostExecutionProps, _context: RenderContext): PuptNode {
    // PostExecution is a container - children will add their actions to the context
    return children;
  }
}
