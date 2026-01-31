import { z } from 'zod';
import { Component } from '../../component';
import type { PuptNode, RenderContext, InputRequirement } from '../../types';
import { attachRequirement, askBaseSchema } from './utils';

export interface ChoiceOption {
  value: string;
  label: string;
}

export const choiceOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
  description: z.string().optional(),
}).passthrough();

export const askChoiceSchema = askBaseSchema.extend({
  default: z.string().optional(),
  options: z.array(choiceOptionSchema).length(2),
}).passthrough();

export type ChoiceProps = z.infer<typeof askChoiceSchema> & { children?: PuptNode };

// Named AskChoice for consistent Ask component naming
export class AskChoice extends Component<ChoiceProps> {
  static schema = askChoiceSchema;
  render(props: ChoiceProps, context: RenderContext): PuptNode {
    const {
      name,
      label,
      description = label,
      required = false,
      default: defaultValue,
      options,
      silent = false,
    } = props;

    const value = context.inputs.get(name);

    const requirement: InputRequirement = {
      name,
      label,
      description,
      type: 'select',  // Choice is a specialized select with exactly 2 options
      required,
      default: defaultValue,
      options: options.map((opt) => ({
        value: opt.value,
        label: opt.label,
        text: opt.label,
      })),
    };

    attachRequirement(context, requirement);

    if (silent) {
      return '';
    }

    const selectedValue = value ?? defaultValue;
    if (selectedValue !== undefined) {
      const selectedOption = options.find((opt) => opt.value === selectedValue);
      if (selectedOption) {
        return selectedOption.label;
      }
      return String(selectedValue);
    }

    return `{${name}}`;
  }
}
