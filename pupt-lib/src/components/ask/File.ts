import { Component } from '../../component';
import type { PuptNode, RenderContext, InputRequirement } from '../../types';
import { attachRequirement } from './utils';

export interface FileProps {
  name: string;
  label: string;
  description?: string;
  required?: boolean;
  default?: string | string[];
  extensions?: string[];
  multiple?: boolean;
  mustExist?: boolean;
  includeContents?: boolean;
  children?: PuptNode;
}

export class AskFile extends Component<FileProps> {
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
