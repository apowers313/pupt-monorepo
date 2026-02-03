import { z } from 'zod';
import { Component } from '../../component';
import type { PuptNode, RenderContext, InputRequirement } from '../../types';
import { attachRequirement, askBaseSchema } from './utils';

export const askSecretSchema = askBaseSchema.extend({
  default: z.string().optional(),
  validator: z.string().optional(),
}).passthrough();

export type SecretProps = z.infer<typeof askSecretSchema> & { children?: PuptNode };

// Named AskSecret for consistent Ask component naming
export class AskSecret extends Component<SecretProps, string> {
  static schema = askSecretSchema;

  resolve(props: SecretProps, context: RenderContext): string {
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

  render(props: SecretProps, resolvedValue: string | undefined, context: RenderContext): PuptNode {
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
      type: 'secret',
      required,
      default: defaultValue,
      masked: true,
    };

    attachRequirement(context, requirement);

    if (silent) {
      return '';
    }

    // Note: In real usage, you may want to mask or omit the value
    // For now, we render it (the consuming application should handle masking in logs)
    // Get actual value - from resolvedValue if available, otherwise compute it
    return resolvedValue ?? this.resolve(props, context);
  }
}
