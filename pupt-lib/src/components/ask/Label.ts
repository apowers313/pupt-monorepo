import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';

export interface LabelProps {
  value: number | string;
  children?: PuptNode;
}

/**
 * Label component for use inside Ask.Rating.
 * Maps a numeric value to a descriptive label.
 */
export class Label extends Component<LabelProps> {
  render(_props: LabelProps, _context: RenderContext): PuptNode {
    // Label components don't render anything directly
    // They're processed by the parent Rating component
    return null;
  }
}
