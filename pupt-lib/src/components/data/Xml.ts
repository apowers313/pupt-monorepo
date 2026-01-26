import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';

interface XmlProps {
  root?: string;
  children: PuptNode;
}

export class Xml extends Component<XmlProps> {
  render({ root = 'data', children }: XmlProps, _context: RenderContext): PuptNode {
    return [
      '```xml\n',
      `<${root}>\n`,
      children,
      `\n</${root}>\n`,
      '```',
    ];
  }
}
