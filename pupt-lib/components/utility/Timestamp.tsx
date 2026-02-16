import { z } from 'zod';
import { Component } from 'pupt-lib';
import type { PuptNode, RenderContext } from 'pupt-lib';

export const timestampSchema = z.object({}).passthrough();

type TimestampProps = z.infer<typeof timestampSchema>;

export class Timestamp extends Component<TimestampProps> {
  static schema = timestampSchema;

  render(_props: TimestampProps, _resolvedValue: void, _context: RenderContext): PuptNode {
    // Return Unix timestamp in seconds
    return String(Math.floor(Date.now() / 1000));
  }
}
