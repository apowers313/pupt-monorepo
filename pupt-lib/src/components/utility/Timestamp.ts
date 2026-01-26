import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface TimestampProps {}

export class Timestamp extends Component<TimestampProps> {
  render(_props: TimestampProps, _context: RenderContext): PuptNode {
    // Return Unix timestamp in seconds
    return String(Math.floor(Date.now() / 1000));
  }
}
