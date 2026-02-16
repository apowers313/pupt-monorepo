import { z } from 'zod';
import { Component } from 'pupt-lib';
import type { PuptNode, RenderContext } from 'pupt-lib';

export const postExecutionSchema = z.object({}).passthrough();

type PostExecutionProps = z.infer<typeof postExecutionSchema> & { children: PuptNode };

export class PostExecution extends Component<PostExecutionProps> {
  static schema = postExecutionSchema;

  render({ children }: PostExecutionProps, _resolvedValue: void, _context: RenderContext): PuptNode {
    // PostExecution is a container - children will add their actions to the context
    return children;
  }
}
