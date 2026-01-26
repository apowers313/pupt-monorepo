import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface CwdProps {}

export class Cwd extends Component<CwdProps> {
  render(_props: CwdProps, _context: RenderContext): PuptNode {
    return process.cwd();
  }
}
