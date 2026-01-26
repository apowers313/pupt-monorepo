import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';

interface ToneProps {
  delimiter?: 'xml' | 'markdown' | 'none';
  children: PuptNode;
}

export class Tone extends Component<ToneProps> {
  render({ delimiter = 'xml', children }: ToneProps, _context: RenderContext): PuptNode {
    const childContent = Array.isArray(children) ? children : children;

    switch (delimiter) {
      case 'xml':
        return ['<tone>\n', childContent, '\n</tone>'];
      case 'markdown':
        return ['## tone\n\n', childContent];
      case 'none':
        return childContent;
    }
  }
}
