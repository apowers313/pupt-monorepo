import { z } from 'zod';
import { Component } from 'pupt-lib';
import type { PuptNode, RenderContext } from 'pupt-lib';

export const uuidSchema = z.object({}).passthrough();

type UUIDProps = z.infer<typeof uuidSchema>;

export class UUID extends Component<UUIDProps> {
  static schema = uuidSchema;

  render(_props: UUIDProps, _resolvedValue: void, _context: RenderContext): PuptNode {
    // Generate a v4 UUID
    return crypto.randomUUID();
  }
}
