import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';
import { userInfo } from 'os';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface UsernameProps {}

export class Username extends Component<UsernameProps> {
  render(_props: UsernameProps, _context: RenderContext): PuptNode {
    return userInfo().username;
  }
}
