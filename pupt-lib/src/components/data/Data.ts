import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';

interface DataProps {
  name: string;
  format?: 'json' | 'xml' | 'text' | 'csv';
  children: PuptNode;
}

export class Data extends Component<DataProps> {
  render({ name, format = 'text', children }: DataProps, _context: RenderContext): PuptNode {
    return [
      `<data name="${name}" format="${format}">\n`,
      children,
      '\n</data>\n',
    ];
  }
}
