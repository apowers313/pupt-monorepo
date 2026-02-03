import { z } from 'zod';
import { Component } from '../../component';
import type { PuptNode, RenderContext, InputRequirement } from '../../types';
import { attachRequirement, askBaseSchema } from './utils';

export const askFileSchema = askBaseSchema.extend({
  default: z.union([z.string(), z.array(z.string())]).optional(),
  extensions: z.array(z.string()).optional(),
  multiple: z.boolean().optional(),
  mustExist: z.boolean().optional(),
  includeContents: z.boolean().optional(),
}).passthrough();

export type FileProps = z.infer<typeof askFileSchema> & { children?: PuptNode };

export class AskFile extends Component<FileProps, string | string[]> {
  static schema = askFileSchema;

  resolve(props: FileProps, context: RenderContext): string | string[] {
    const { name, default: defaultValue, multiple = false } = props;
    const value = context.inputs.get(name);

    if (value !== undefined) {
      if (multiple && Array.isArray(value)) {
        return value.map(String);
      }
      return Array.isArray(value) ? value.map(String) : String(value);
    }

    if (defaultValue !== undefined) {
      return defaultValue;
    }

    return multiple ? [] : '';
  }

  render(props: FileProps, resolvedValue: string | string[] | undefined, context: RenderContext): PuptNode {
    const {
      name,
      label,
      description = label,
      required = false,
      default: defaultValue,
      extensions,
      multiple = false,
      mustExist = false,
      includeContents = false,
      silent = false,
    } = props;

    const requirement: InputRequirement = {
      name,
      label,
      description,
      type: 'file',
      required,
      default: defaultValue,
      extensions,
      multiple,
      mustExist,
      includeContents,
    };

    attachRequirement(context, requirement);

    if (silent) {
      return '';
    }

    // Get actual value - from resolvedValue if available, otherwise compute it
    const actualValue = resolvedValue ?? this.resolve(props, context);

    if (Array.isArray(actualValue)) {
      if (actualValue.length === 0) {
        return `{${name}}`;
      }
      return actualValue.join(', ');
    }

    return actualValue || `{${name}}`;
  }
}
