import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface UUIDProps {}

export class UUID extends Component<UUIDProps> {
  render(_props: UUIDProps, _context: RenderContext): PuptNode {
    // Generate a v4 UUID
    return crypto.randomUUID();
  }
}
