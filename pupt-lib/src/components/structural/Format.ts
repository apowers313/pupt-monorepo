import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';

interface FormatProps {
  type: 'json' | 'markdown' | 'xml' | 'text' | 'code';
  language?: string;
  children?: PuptNode;
}

export class Format extends Component<FormatProps> {
  render({ type, language, children }: FormatProps, _context: RenderContext): PuptNode {
    const formatDescription = language ? `${type} (${language})` : type;

    const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
    if (hasChildren) {
      return [`Output format: ${formatDescription}\n`, children];
    }

    return `Output format: ${formatDescription}`;
  }
}
