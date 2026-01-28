import { z } from 'zod';
import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';

export const uuidSchema = z.object({}).passthrough();

type UUIDProps = z.infer<typeof uuidSchema>;

export class UUID extends Component<UUIDProps> {
  static schema = uuidSchema;

  render(_props: UUIDProps, _context: RenderContext): PuptNode {
    // Generate a v4 UUID
    return crypto.randomUUID();
  }
}
