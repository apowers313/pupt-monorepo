import { z } from 'zod';
import { Component } from '../../component';
import type { PuptNode, RenderContext, InputRequirement } from '../../types';
import { attachRequirement, askBaseSchema } from './utils';

export const askPathSchema = askBaseSchema.extend({
  default: z.string().optional(),
  mustExist: z.boolean().optional(),
  mustBeDirectory: z.boolean().optional(),
}).passthrough();

export type PathProps = z.infer<typeof askPathSchema> & { children?: PuptNode };

// Named AskPath for consistent Ask component naming
export class AskPath extends Component<PathProps> {
  static schema = askPathSchema;
  render(props: PathProps, context: RenderContext): PuptNode {
    const {
      name,
      label,
      description = label,
      required = false,
      default: defaultValue,
      mustExist = false,
      mustBeDirectory = false,
      silent = false,
    } = props;

    const value = context.inputs.get(name);

    const requirement: InputRequirement = {
      name,
      label,
      description,
      type: 'path',
      required,
      default: defaultValue,
      mustExist,
      mustBeDirectory,
    };

    attachRequirement(context, requirement);

    if (silent) {
      return '';
    }

    if (value !== undefined) {
      return String(value);
    }

    if (defaultValue !== undefined) {
      return String(defaultValue);
    }

    return `{${name}}`;
  }
}
