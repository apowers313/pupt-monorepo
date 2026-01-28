import { z } from 'zod';
import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';

export const promptSchema = z.object({
  name: z.string(),
  version: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
}).passthrough();

type PromptProps = z.infer<typeof promptSchema> & { children: PuptNode };

export class Prompt extends Component<PromptProps> {
  static schema = promptSchema;

  render({ children }: PromptProps, _context: RenderContext): PuptNode {
    // Prompt is a container - just render children
    // Metadata is available for discovery, not rendered
    return children;
  }
}
