import { z } from 'zod';
import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';

export const jsonSchema = z.object({
  indent: z.number().optional(),
}).passthrough();

type JsonProps = z.infer<typeof jsonSchema> & { children: unknown };

export class Json extends Component<JsonProps> {
  static schema = jsonSchema;

  render({ indent = 2, children }: JsonProps, _resolvedValue: void, _context: RenderContext): PuptNode {
    const jsonString = JSON.stringify(children, null, indent);
    return ['```json\n', jsonString, '\n```'];
  }
}
