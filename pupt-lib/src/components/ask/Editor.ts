import { z } from 'zod';
import { Component } from '../../component';
import type { PuptNode, RenderContext, InputRequirement } from '../../types';
import { attachRequirement, askBaseSchema } from './utils';

export const askEditorSchema = askBaseSchema.extend({
  default: z.string().optional(),
  language: z.string().optional(),
}).passthrough();

export type EditorProps = z.infer<typeof askEditorSchema> & { children?: PuptNode };

// Named AskEditor for consistent Ask component naming
export class AskEditor extends Component<EditorProps> {
  static schema = askEditorSchema;
  render(props: EditorProps, context: RenderContext): PuptNode {
    const {
      name,
      label,
      description = label,
      required = false,
      default: defaultValue,
      language,
    } = props;

    const value = context.inputs.get(name);

    const requirement: InputRequirement = {
      name,
      label,
      description,
      type: 'string',
      required,
      default: defaultValue,
      language,
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
