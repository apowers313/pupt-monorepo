import { Component } from '../../component';
import type { PuptNode, RenderContext, InputRequirement } from '../../types';
import { attachRequirement } from './utils';

export interface PathProps {
  name: string;
  label: string;
  description?: string;
  required?: boolean;
  default?: string;
  mustExist?: boolean;
  mustBeDirectory?: boolean;
  children?: PuptNode;
}

// Named AskPath for consistent Ask component naming
export class AskPath extends Component<PathProps> {
  render(props: PathProps, context: RenderContext): PuptNode {
    const {
      name,
      label,
      description = label,
      required = false,
      default: defaultValue,
      mustExist = false,
      mustBeDirectory = false,
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

    if (value !== undefined) {
      return String(value);
    }

    if (defaultValue !== undefined) {
      return String(defaultValue);
    }

    return `{${name}}`;
  }
}
