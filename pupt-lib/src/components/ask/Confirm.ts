import { z } from 'zod';
import { Component } from '../../component';
import type { PuptNode, RenderContext, InputRequirement } from '../../types';
import { attachRequirement, askBaseSchema } from './utils';

export const askConfirmSchema = askBaseSchema.extend({
  default: z.boolean().optional(),
}).passthrough();

export type ConfirmProps = z.infer<typeof askConfirmSchema> & { children?: PuptNode };

// Named AskConfirm for consistent Ask component naming
export class AskConfirm extends Component<ConfirmProps> {
  static schema = askConfirmSchema;
  render(props: ConfirmProps, context: RenderContext): PuptNode {
    const {
      name,
      label,
      description = label,
      required = false,
      default: defaultValue,
    } = props;

    const value = context.inputs.get(name);

    const requirement: InputRequirement = {
      name,
      label,
      description,
      type: 'boolean',
      required,
      default: defaultValue,
    };

    attachRequirement(context, requirement);

    if (value !== undefined) {
      return value ? 'Yes' : 'No';
    }

    if (defaultValue !== undefined) {
      return defaultValue ? 'Yes' : 'No';
    }

    return `{${name}}`;
  }
}
