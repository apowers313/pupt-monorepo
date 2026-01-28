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

export class AskFile extends Component<FileProps> {
  static schema = askFileSchema;
  render(props: FileProps, context: RenderContext): PuptNode {
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
    } = props;

    const value = context.inputs.get(name);

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

    if (value !== undefined) {
      if (Array.isArray(value)) {
        return value.join(', ');
      }
      return String(value);
    }

    if (defaultValue !== undefined) {
      if (Array.isArray(defaultValue)) {
        return defaultValue.join(', ');
      }
      return String(defaultValue);
    }

    return `{${name}}`;
  }
}
