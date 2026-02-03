import { z } from 'zod';
import { Component } from '../../component';
import type { PuptNode, RenderContext, InputRequirement } from '../../types';
import { attachRequirement, askBaseSchema } from './utils';

export const askConfirmSchema = askBaseSchema.extend({
  default: z.boolean().optional(),
}).passthrough();

export type ConfirmProps = z.infer<typeof askConfirmSchema> & { children?: PuptNode };

// Named AskConfirm for consistent Ask component naming
export class AskConfirm extends Component<ConfirmProps, boolean | undefined> {
  static schema = askConfirmSchema;

  resolve(props: ConfirmProps, context: RenderContext): boolean | undefined {
    const { name, default: defaultValue } = props;
    const value = context.inputs.get(name);

    if (value !== undefined) {
      return Boolean(value);
    }

    if (defaultValue !== undefined) {
      return defaultValue;
    }

    return undefined;
  }

  render(props: ConfirmProps, resolvedValue: boolean | undefined, context: RenderContext): PuptNode {
    const {
      name,
      label,
      description = label,
      required = false,
      default: defaultValue,
      silent = false,
    } = props;

    const requirement: InputRequirement = {
      name,
      label,
      description,
      type: 'boolean',
      required,
      default: defaultValue,
    };

    attachRequirement(context, requirement);

    if (silent) {
      return '';
    }

    // Get actual value - from resolvedValue if available, otherwise compute it
    const actualValue = resolvedValue ?? this.resolve(props, context);

    if (actualValue === undefined) {
      return `{${name}}`;
    }

    return actualValue ? 'Yes' : 'No';
  }
}
