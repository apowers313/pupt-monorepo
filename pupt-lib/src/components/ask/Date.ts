import { z } from 'zod';
import { Component } from '../../component';
import type { PuptNode, RenderContext, InputRequirement } from '../../types';
import { attachRequirement, askBaseSchema } from './utils';

export const askDateSchema = askBaseSchema.extend({
  default: z.string().optional(),
  includeTime: z.boolean().optional(),
  minDate: z.string().optional(),
  maxDate: z.string().optional(),
}).passthrough();

export type DateProps = z.infer<typeof askDateSchema> & { children?: PuptNode };

// Named AskDate to avoid collision with JavaScript's Date global
export class AskDate extends Component<DateProps> {
  static schema = askDateSchema;
  render(props: DateProps, context: RenderContext): PuptNode {
    const {
      name,
      label,
      description = label,
      required = false,
      default: defaultValue,
      includeTime = false,
      minDate,
      maxDate,
    } = props;

    const value = context.inputs.get(name);

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

    if (value !== undefined) {
      return String(value);
    }

    if (defaultValue !== undefined) {
      return String(defaultValue);
    }

    return `{${name}}`;
  }
}
