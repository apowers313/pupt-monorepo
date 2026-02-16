import { z } from 'zod';
import { Component, wrapWithDelimiter } from 'pupt-lib';
import { TASK_PRESETS } from '../presets';
import type { PuptNode, RenderContext } from 'pupt-lib';

export const taskSchema = z.object({
  preset: z.string().optional(),
  verb: z.string().optional(),
  subject: z.string().optional(),
  objective: z.string().optional(),
  scope: z.enum(['narrow', 'broad', 'comprehensive']).optional(),
  complexity: z.enum(['simple', 'moderate', 'complex']).optional(),
  delimiter: z.enum(['xml', 'markdown', 'none']).optional(),
}).passthrough();

type TaskProps = z.infer<typeof taskSchema> & { children?: PuptNode };

export class Task extends Component<TaskProps> {
  static schema = taskSchema;

  render(props: TaskProps, _resolvedValue: void, _context: RenderContext): PuptNode {
    const { preset, verb, subject, objective, scope, complexity, delimiter = 'xml', children } = props;

    // If custom children, use them
    if (this.hasContent(children)) {
      return wrapWithDelimiter(children, 'task', delimiter);
    }

    // Build from preset + customizations
    const config = preset ? TASK_PRESETS[preset] : undefined;
    const actionVerb = verb ?? config?.verbs[0] ?? 'Complete';

    // Build instruction
    const parts = [actionVerb];
    if (subject) parts.push(subject);
    if (objective) parts.push(`to ${objective}`);

    let instruction = parts.join(' ') + '.';

    // Add scope qualifier
    if (scope) {
      const scopeText: Record<string, string> = {
        'narrow': 'Focus narrowly on the specific request.',
        'broad': 'Take a broad approach covering related aspects.',
        'comprehensive': 'Provide a comprehensive and thorough response.',
      };
      instruction += ' ' + scopeText[scope];
    }

    // Add complexity qualifier
    if (complexity) {
      const complexityText: Record<string, string> = {
        'simple': 'Keep the approach simple and straightforward.',
        'moderate': 'Balance detail with clarity.',
        'complex': 'Address edge cases and nuances.',
      };
      instruction += ' ' + complexityText[complexity];
    }

    return wrapWithDelimiter(instruction, 'task', delimiter);
  }
}
