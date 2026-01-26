import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';

interface CodeProps {
  language?: string;
  filename?: string;
  children: PuptNode;
}

export class Code extends Component<CodeProps> {
  render({ language = '', filename, children }: CodeProps, _context: RenderContext): PuptNode {
    const parts: PuptNode[] = [];

    if (filename) {
      parts.push(`<!-- ${filename} -->\n`);
    }

    parts.push(`\`\`\`${language}\n`);
    parts.push(children);
    parts.push('\n```');

    return parts;
  }
}
