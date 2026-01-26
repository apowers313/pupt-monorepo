import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';

interface RoleProps {
  expertise?: string;
  domain?: string;
  delimiter?: 'xml' | 'markdown' | 'none';
  children: PuptNode;
}

export class Role extends Component<RoleProps> {
  render({ delimiter = 'xml', children }: RoleProps, _context: RenderContext): PuptNode {
    const childContent = Array.isArray(children) ? children : children;

    switch (delimiter) {
      case 'xml':
        return ['<role>\n', childContent, '\n</role>'];
      case 'markdown':
        return ['## role\n\n', childContent];
      case 'none':
        return childContent;
    }
  }
}
