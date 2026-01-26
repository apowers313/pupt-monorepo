import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';

interface AudienceProps {
  delimiter?: 'xml' | 'markdown' | 'none';
  children: PuptNode;
}

export class Audience extends Component<AudienceProps> {
  render({ delimiter = 'xml', children }: AudienceProps, _context: RenderContext): PuptNode {
    const childContent = Array.isArray(children) ? children : children;

    switch (delimiter) {
      case 'xml':
        return ['<audience>\n', childContent, '\n</audience>'];
      case 'markdown':
        return ['## audience\n\n', childContent];
      case 'none':
        return childContent;
    }
  }
}
