import type { InputRequirement,RenderContext } from '@pupt/lib';
import { z } from 'zod';

export const askBaseSchema = z.object({
  name: z.string(),
  label: z.string(),
  description: z.string().optional(),
  required: z.boolean().optional(),
  silent: z.boolean().optional(),
});

/**
 * Attach an input requirement to the context for InputIterator to collect.
 */
export function attachRequirement(context: RenderContext, requirement: InputRequirement): void {
  const requirements = (context as unknown as { __requirements?: InputRequirement[] }).__requirements;
  if (requirements) {
    requirements.push(requirement);
  }
}
