import { z } from 'zod';
import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';

export const usernameSchema = z.object({}).passthrough();

type UsernameProps = z.infer<typeof usernameSchema>;

export class Username extends Component<UsernameProps> {
  static schema = usernameSchema;

  render(_props: UsernameProps, _resolvedValue: void, context: RenderContext): PuptNode {
    // Use the username from runtime config (already handles browser/Node detection)
    return context.env.runtime.username ?? 'anonymous';
  }
}
