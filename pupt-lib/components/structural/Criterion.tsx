import { z } from 'zod';
import { Component } from 'pupt-lib';
import type { PuptNode, RenderContext } from 'pupt-lib';

export const criterionSchema = z.object({
  category: z.enum(['accuracy', 'completeness', 'relevance', 'clarity', 'format', 'tone', 'efficiency']).optional(),
  metric: z.string().optional(),
  weight: z.enum(['critical', 'important', 'nice-to-have']).optional(),
}).passthrough();

type CriterionProps = z.infer<typeof criterionSchema> & { children: PuptNode };

export class Criterion extends Component<CriterionProps> {
  static schema = criterionSchema;

  render(props: CriterionProps, _resolvedValue: void, _context: RenderContext): PuptNode {
    const { category, metric, weight, children } = props;

    const parts: PuptNode[] = ['- '];

    // Weight prefix
    if (weight === 'critical') {
      parts.push('[CRITICAL] ');
    } else if (weight === 'important') {
      parts.push('[IMPORTANT] ');
    }

    // Main content
    parts.push(children);

    // Category tag
    if (category) {
      parts.push(` (${category})`);
    }

    // Metric
    if (metric) {
      parts.push(` [${metric}]`);
    }

    parts.push('\n');
    return parts;
  }
}
