import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';
import { hostname } from 'os';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface HostnameProps {}

export class Hostname extends Component<HostnameProps> {
  render(_props: HostnameProps, _context: RenderContext): PuptNode {
    return hostname();
  }
}
