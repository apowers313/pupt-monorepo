import { z } from 'zod';
import { Component, wrapWithDelimiter } from 'pupt-lib';
import type { PuptNode, RenderContext } from 'pupt-lib';

export const successCriteriaSchema = z.object({
  presets: z.array(z.string()).optional(),
  extend: z.boolean().optional(),
  metrics: z.array(z.object({
    name: z.string(),
    threshold: z.string(),
  })).optional(),
  delimiter: z.enum(['xml', 'markdown', 'none']).optional(),
}).passthrough();

type SuccessCriteriaProps = z.infer<typeof successCriteriaSchema> & { children?: PuptNode };

const CRITERIA_PRESETS: Record<string, string[]> = {
  'accuracy': ['Response is factually accurate', 'No fabricated information'],
  'completeness': ['Addresses all parts of the question', 'Includes all required sections'],
  'clarity': ['Easy to follow and understand', 'Well-organized structure'],
  'relevance': ['Directly answers the question', 'No off-topic content'],
  'format': ['Follows the specified output format', 'Consistent formatting throughout'],
  'security': ['No sensitive data exposed', 'Follows security best practices'],
};

export class SuccessCriteria extends Component<SuccessCriteriaProps> {
  static schema = successCriteriaSchema;

  render(props: SuccessCriteriaProps, _resolvedValue: void, _context: RenderContext): PuptNode {
    const { presets, metrics, delimiter = 'xml', children } = props;

    const sections: PuptNode[] = [];

    // Render preset criteria
    if (presets && presets.length > 0) {
      for (const presetName of presets) {
        const criteria = CRITERIA_PRESETS[presetName];
        if (criteria) {
          for (const criterion of criteria) {
            sections.push(`- ${criterion}\n`);
          }
        }
      }
    }

    // Render children (custom criteria)
    if (this.hasContent(children)) {
      sections.push(children);
    }

    // Render metrics
    if (metrics && metrics.length > 0) {
      sections.push('\nMetrics:\n');
      for (const metric of metrics) {
        sections.push(`- ${metric.name}: ${metric.threshold}\n`);
      }
    }

    const content = sections.length === 1 ? sections[0] : sections;
    return wrapWithDelimiter(content, 'success-criteria', delimiter);
  }
}
