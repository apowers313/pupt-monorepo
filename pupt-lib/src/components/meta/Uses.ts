import { z } from 'zod';
import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';

export const usesSchema = z.object({
  prompt: z.string(),
  as: z.string().optional(),
}).passthrough();

type UsesProps = z.infer<typeof usesSchema> & { children?: PuptNode };

export class Uses extends Component<UsesProps> {
  static schema = usesSchema;

  render(_props: UsesProps, _context: RenderContext): PuptNode {
    // Uses is a dependency declaration - parsed but not rendered
    // The dependency resolution happens at a higher level
    return null;
  }
}
