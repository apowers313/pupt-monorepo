import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';

interface ContextProps {
  delimiter?: 'xml' | 'markdown' | 'none';
  children: PuptNode;
}

export class Context extends Component<ContextProps> {
  render({ delimiter = 'xml', children }: ContextProps, _context: RenderContext): PuptNode {
    const childContent = Array.isArray(children) ? children : children;

    switch (delimiter) {
      case 'xml':
        return ['<context>\n', childContent, '\n</context>'];
      case 'markdown':
        return ['## context\n\n', childContent];
      case 'none':
        return childContent;
    }
  }
}
