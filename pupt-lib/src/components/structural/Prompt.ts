import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';

interface PromptProps {
  name: string;
  version?: string;
  description?: string;
  tags?: string[];
  children: PuptNode;
}

export class Prompt extends Component<PromptProps> {
  render({ children }: PromptProps, _context: RenderContext): PuptNode {
    // Prompt is a container - just render children
    // Metadata is available for discovery, not rendered
    return children;
  }
}
