import { z } from 'zod';
import { Component } from 'pupt-lib';
import { askBaseSchema, attachRequirement } from './utils';
import type { PuptNode, RenderContext, InputRequirement } from 'pupt-lib';

export const askTextSchema = askBaseSchema.extend({
  default: z.string().optional(),
  placeholder: z.string().optional(),
}).passthrough();

export type TextProps = z.infer<typeof askTextSchema> & { children?: PuptNode };

// Named AskText to avoid potential bundler conflicts with common identifiers
export class AskText extends Component<TextProps, string> {
  static schema = askTextSchema;

  resolve(props: TextProps, context: RenderContext): string {
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

  render(props: TextProps, resolvedValue: string | undefined, context: RenderContext): PuptNode {
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
      type: 'string',
      required,
      default: defaultValue,
    };

    attachRequirement(context, requirement);

    if (silent) {
      return '';
    }

    // Get actual value - from resolvedValue if available, otherwise compute it
    return resolvedValue ?? this.resolve(props, context);
  }
}
