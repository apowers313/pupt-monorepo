import { z } from 'zod';
import { Component } from '../../component';
import type { PuptNode, RenderContext, InputRequirement } from '../../types';
import { attachRequirement, askBaseSchema } from './utils';

export const askReviewFileSchema = askBaseSchema.extend({
  default: z.string().optional(),
  extensions: z.array(z.string()).optional(),
  editor: z.string().optional(),
}).passthrough();

export type ReviewFileProps = z.infer<typeof askReviewFileSchema> & { children?: PuptNode };

/**
 * Ask.ReviewFile combines file selection with automatic post-execution review.
 * It's syntactic sugar for:
 *   <Ask.File name="..." />
 *   <PostExecution><ReviewFile input="..." /></PostExecution>
 */
export class AskReviewFile extends Component<ReviewFileProps, string> {
  static schema = askReviewFileSchema;

  resolve(props: ReviewFileProps, context: RenderContext): string {
    const { name, default: defaultValue } = props;
    const value = context.inputs.get(name);

    if (value !== undefined) {
      return String(value);
    }

    if (defaultValue !== undefined) {
      return defaultValue;
    }

    return `{${name}}`;
  }

  render(props: ReviewFileProps, resolvedValue: string | undefined, context: RenderContext): PuptNode {
    const {
      name,
      label,
      description = label,
      required = false,
      default: defaultValue,
      extensions,
      editor,
      silent = false,
    } = props;

    // Register as a file input
    const requirement: InputRequirement = {
      name,
      label,
      description,
      type: 'file',
      required,
      default: defaultValue,
      extensions,
      mustExist: false,  // File may be created during execution
    };

    attachRequirement(context, requirement);

    // Get actual value - from resolvedValue if available, otherwise compute it
    const actualValue = resolvedValue ?? this.resolve(props, context);

    // Register post-execution action to review this file
    if (actualValue && !actualValue.startsWith('{') && context.postExecution) {
      context.postExecution.push({
        type: 'reviewFile',
        file: actualValue,
        editor,
      });
    }

    if (silent) {
      return '';
    }

    return actualValue;
  }
}
