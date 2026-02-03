import { z } from 'zod';
import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';

export const cwdSchema = z.object({}).passthrough();

type CwdProps = z.infer<typeof cwdSchema>;

export class Cwd extends Component<CwdProps> {
  static schema = cwdSchema;

  render(_props: CwdProps, _resolvedValue: void, _context: RenderContext): PuptNode {
    return process.cwd();
  }
}
