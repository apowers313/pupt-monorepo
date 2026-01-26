import { Component } from '../../component';
import type { PuptNode, RenderContext, InputRequirement } from '../../types';
import { attachRequirement } from './utils';

export interface ReviewFileProps {
  name: string;
  label: string;
  description?: string;
  required?: boolean;
  default?: string;
  extensions?: string[];
  editor?: string;
  children?: PuptNode;
}

/**
 * Ask.ReviewFile combines file selection with automatic post-execution review.
 * It's syntactic sugar for:
 *   <Ask.File name="..." />
 *   <PostExecution><ReviewFile input="..." /></PostExecution>
 */
export class AskReviewFile extends Component<ReviewFileProps> {
  render(props: ReviewFileProps, context: RenderContext): PuptNode {
    const {
      name,
      label,
      description = label,
      required = false,
      default: defaultValue,
      extensions,
      editor,
    } = props;

    const value = context.inputs.get(name);

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

    // Register post-execution action to review this file
    const filePath = value ?? defaultValue;
    if (filePath && context.postExecution) {
      context.postExecution.push({
        type: 'reviewFile',
        file: String(filePath),
        editor,
      });
    }

    if (value !== undefined) {
      return String(value);
    }

    if (defaultValue !== undefined) {
      return String(defaultValue);
    }

    return `{${name}}`;
  }
}
