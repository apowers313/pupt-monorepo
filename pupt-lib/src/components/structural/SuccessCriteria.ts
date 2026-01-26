import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';

interface SuccessCriteriaProps {
  delimiter?: 'xml' | 'markdown' | 'none';
  children: PuptNode;
}

export class SuccessCriteria extends Component<SuccessCriteriaProps> {
  render({ delimiter = 'xml', children }: SuccessCriteriaProps, _context: RenderContext): PuptNode {
    const childContent = Array.isArray(children) ? children : children;

    switch (delimiter) {
      case 'xml':
        return ['<success-criteria>\n', childContent, '\n</success-criteria>'];
      case 'markdown':
        return ['## success-criteria\n\n', childContent];
      case 'none':
        return childContent;
    }
  }
}
