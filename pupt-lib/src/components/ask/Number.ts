import { z } from 'zod';
import { Component } from '../../component';
import type { PuptNode, RenderContext, InputRequirement } from '../../types';
import { attachRequirement, askBaseSchema } from './utils';

export const askNumberSchema = askBaseSchema.extend({
  default: z.number().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
}).passthrough();

export type NumberProps = z.infer<typeof askNumberSchema> & { children?: PuptNode };

// Named AskNumber to avoid collision with JavaScript's Number global
export class AskNumber extends Component<NumberProps> {
  static schema = askNumberSchema;
  render(props: NumberProps, context: RenderContext): PuptNode {
    const {
      name,
      label,
      description = label,
      required = false,
      default: defaultValue,
      min,
      max,
    } = props;

    const value = context.inputs.get(name);

    const requirement: InputRequirement = {
      name,
      label,
      description,
      type: 'number',
      required,
      default: defaultValue,
      min,
      max,
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
