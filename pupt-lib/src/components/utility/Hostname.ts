import { z } from 'zod';
import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';

export const hostnameSchema = z.object({}).passthrough();

type HostnameProps = z.infer<typeof hostnameSchema>;

export class Hostname extends Component<HostnameProps> {
  static schema = hostnameSchema;

  render(_props: HostnameProps, context: RenderContext): PuptNode {
    // Use the hostname from runtime config (already handles browser/Node detection)
    return context.env.runtime.hostname ?? 'unknown';
  }
}
