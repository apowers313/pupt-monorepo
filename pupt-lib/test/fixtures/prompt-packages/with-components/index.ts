import { z } from 'zod';

import { Component } from '../../../../src/component';

export class Greeting extends Component<{ name?: string; children?: unknown }> {
  static schema = z.object({ name: z.string().optional() }).loose();
  render(props: { name?: string }): string {
    return `Hello, ${props.name ?? 'World'}!`;
  }
}

export const dependencies: string[] = [];
