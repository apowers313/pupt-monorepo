import { z } from 'zod';
import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';
import { userInfo } from 'os';

export const usernameSchema = z.object({}).passthrough();

type UsernameProps = z.infer<typeof usernameSchema>;

export class Username extends Component<UsernameProps> {
  static schema = usernameSchema;

  render(_props: UsernameProps, _context: RenderContext): PuptNode {
    return userInfo().username;
  }
}
