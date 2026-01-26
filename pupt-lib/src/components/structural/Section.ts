import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';

interface SectionProps {
  name: string;
  delimiter?: 'xml' | 'markdown' | 'none';
  children: PuptNode;
}

export class Section extends Component<SectionProps> {
  render({ name, delimiter = 'xml', children }: SectionProps, _context: RenderContext): PuptNode {
    // For arrays, we need to flatten them into a string representation
    const childContent = Array.isArray(children) ? children : children;

    switch (delimiter) {
      case 'xml':
        return [`<${name}>\n`, childContent, `\n</${name}>`];
      case 'markdown':
        return [`## ${name}\n\n`, childContent];
      case 'none':
        return childContent;
    }
  }
}
