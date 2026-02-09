import { z } from 'zod';
import { Component } from 'pupt-lib';
import { askBaseSchema, attachRequirement } from './utils';
import type { PuptNode, RenderContext, InputRequirement } from 'pupt-lib';

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
export class AskChoice extends Component<ChoiceProps, string> {
  static schema = askChoiceSchema;

  resolve(props: ChoiceProps, context: RenderContext): string {
    const { name, default: defaultValue } = props;
    const value = context.inputs.get(name);

    if (value !== undefined) {
      return String(value);
    }

    if (defaultValue !== undefined) {
      return defaultValue;
    }

    return '';
  }

  render(props: ChoiceProps, resolvedValue: string | undefined, context: RenderContext): PuptNode {
    const {
      name,
      label,
      description = label,
      required = false,
      default: defaultValue,
      options,
      silent = false,
    } = props;

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

    // Get actual value - from resolvedValue if available, otherwise compute it
    const actualValue = resolvedValue ?? this.resolve(props, context);

    if (actualValue) {
      const selectedOption = options.find((opt) => opt.value === actualValue);
      if (selectedOption) {
        return selectedOption.label;
      }
      return actualValue;
    }

    return `{${name}}`;
  }
}
