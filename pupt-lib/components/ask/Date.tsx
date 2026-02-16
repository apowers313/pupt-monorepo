import { z } from 'zod';
import { Component } from 'pupt-lib';
import { askBaseSchema, attachRequirement } from './utils';
import type { PuptNode, RenderContext, InputRequirement } from 'pupt-lib';

export const askDateSchema = askBaseSchema.extend({
  default: z.string().optional(),
  includeTime: z.boolean().optional(),
  minDate: z.string().optional(),
  maxDate: z.string().optional(),
}).passthrough();

export type DateProps = z.infer<typeof askDateSchema> & { children?: PuptNode };

// Named AskDate to avoid collision with JavaScript's Date global
export class AskDate extends Component<DateProps, string> {
  static schema = askDateSchema;

  resolve(props: DateProps, context: RenderContext): string {
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

  render(props: DateProps, resolvedValue: string | undefined, context: RenderContext): PuptNode {
    const {
      name,
      label,
      description = label,
      required = false,
      default: defaultValue,
      includeTime = false,
      minDate,
      maxDate,
      silent = false,
    } = props;

    const requirement: InputRequirement = {
      name,
      label,
      description,
      type: 'date',
      required,
      default: defaultValue,
      includeTime,
      minDate,
      maxDate,
    };

    attachRequirement(context, requirement);

    if (silent) {
      return '';
    }

    // Get actual value - from resolvedValue if available, otherwise compute it
    return resolvedValue ?? this.resolve(props, context);
  }
}
