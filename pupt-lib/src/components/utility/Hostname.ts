import { z } from 'zod';
import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';
import { hostname } from 'os';

export const hostnameSchema = z.object({}).passthrough();

type HostnameProps = z.infer<typeof hostnameSchema>;

export class Hostname extends Component<HostnameProps> {
  static schema = hostnameSchema;

  render(_props: HostnameProps, _context: RenderContext): PuptNode {
    return hostname();
  }
}
