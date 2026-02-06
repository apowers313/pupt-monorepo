import { z } from 'zod';
import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';

export const taskSchema = z.object({
  delimiter: z.enum(['xml', 'markdown', 'none']).optional(),
}).passthrough();

type TaskProps = z.infer<typeof taskSchema> & { children: PuptNode };

export class Task extends Component<TaskProps> {
  static schema = taskSchema;

  render({ delimiter = 'xml', children }: TaskProps, _resolvedValue: void, _context: RenderContext): PuptNode {
    const childContent = Array.isArray(children) ? children : children;

    switch (delimiter) {
      case 'xml':
        return ['<task>\n', childContent, '\n</task>\n'];
      case 'markdown':
        return ['## task\n\n', childContent];
      case 'none':
        return childContent;
    }
  }
}
