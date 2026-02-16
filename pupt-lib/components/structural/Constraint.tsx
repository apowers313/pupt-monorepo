import { z } from 'zod';
import { Component, wrapWithDelimiter } from 'pupt-lib';
import { CONSTRAINT_PRESETS, PROVIDER_ADAPTATIONS } from '../presets';
import type { PuptNode, RenderContext } from 'pupt-lib';

export const constraintSchema = z.object({
  preset: z.string().optional(),
  type: z.enum(['must', 'should', 'must-not', 'may', 'should-not']).optional(),
  category: z.enum(['content', 'format', 'tone', 'scope', 'accuracy', 'safety', 'performance']).optional(),
  positive: z.string().optional(),
  delimiter: z.enum(['xml', 'markdown', 'none']).optional(),
}).passthrough();

type ConstraintProps = z.infer<typeof constraintSchema> & { children?: PuptNode };

export class Constraint extends Component<ConstraintProps> {
  static schema = constraintSchema;

  render(props: ConstraintProps, _resolvedValue: void, context: RenderContext): PuptNode {
    const { preset, type, positive, delimiter = 'xml', children } = props;

    // Get preset config if using preset
    const config = preset ? CONSTRAINT_PRESETS[preset] : undefined;
    const constraintType = type ?? config?.level;

    const provider = this.getProvider(context);
    const adaptations = PROVIDER_ADAPTATIONS[provider];

    // Determine if we should use positive framing
    if (constraintType) {
      const usePositive = (constraintType === 'must-not' || constraintType === 'should-not') &&
                          adaptations.constraintStyle === 'positive';

      if (usePositive) {
        const positiveText = positive ?? config?.positiveAlternative;
        if (positiveText) {
          return this.formatConstraint('must', positiveText, delimiter);
        }
      }
    }

    // Standard rendering - prefer children if present, otherwise use preset text
    const content = this.hasContent(children) ? children : config?.text;
    if (content === undefined || content === null) {
      return wrapWithDelimiter('', 'constraint', delimiter);
    }

    // If no type specified, render without prefix
    if (!constraintType) {
      return wrapWithDelimiter(content, 'constraint', delimiter);
    }
    return this.formatConstraint(constraintType, content, delimiter);
  }

  private formatConstraint(type: string, content: PuptNode, delimiter: 'xml' | 'markdown' | 'none'): PuptNode {
    const prefix: Record<string, string> = {
      'must': 'MUST: ',
      'should': 'SHOULD: ',
      'may': 'MAY: ',
      'must-not': 'MUST NOT: ',
      'should-not': 'SHOULD NOT: ',
    };

    const innerContent = [prefix[type] ?? '', content];
    return wrapWithDelimiter(innerContent, 'constraint', delimiter);
  }
}
