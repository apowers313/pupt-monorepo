import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';

interface JsonProps {
  indent?: number;
  children: unknown;
}

export class Json extends Component<JsonProps> {
  render({ indent = 2, children }: JsonProps, _context: RenderContext): PuptNode {
    const jsonString = JSON.stringify(children, null, indent);
    return ['```json\n', jsonString, '\n```'];
  }
}
