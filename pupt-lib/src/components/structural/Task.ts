import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';

interface TaskProps {
  delimiter?: 'xml' | 'markdown' | 'none';
  children: PuptNode;
}

export class Task extends Component<TaskProps> {
  render({ delimiter = 'xml', children }: TaskProps, _context: RenderContext): PuptNode {
    const childContent = Array.isArray(children) ? children : children;

    switch (delimiter) {
      case 'xml':
        return ['<task>\n', childContent, '\n</task>'];
      case 'markdown':
        return ['## task\n\n', childContent];
      case 'none':
        return childContent;
    }
  }
}
