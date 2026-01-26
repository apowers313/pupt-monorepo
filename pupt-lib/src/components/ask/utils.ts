import type { RenderContext, InputRequirement } from '../../types';

/**
 * Attach an input requirement to the context for InputIterator to collect.
 */
export function attachRequirement(context: RenderContext, requirement: InputRequirement): void {
  const requirements = (context as unknown as { __requirements?: InputRequirement[] }).__requirements;
  if (requirements) {
    requirements.push(requirement);
  }
}
