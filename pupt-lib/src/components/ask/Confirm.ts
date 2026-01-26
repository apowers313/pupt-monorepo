import { Component } from '../../component';
import type { PuptNode, RenderContext, InputRequirement } from '../../types';
import { attachRequirement } from './utils';

export interface ConfirmProps {
  name: string;
  label: string;
  description?: string;
  required?: boolean;
  default?: boolean;
  children?: PuptNode;
}

export class Confirm extends Component<ConfirmProps> {
  render(props: ConfirmProps, context: RenderContext): PuptNode {
    const {
      name,
      label,
      description = label,
      required = false,
      default: defaultValue,
    } = props;

    const value = context.inputs.get(name);

    const requirement: InputRequirement = {
      name,
      label,
      description,
      type: 'boolean',
      required,
      default: defaultValue,
    };

    attachRequirement(context, requirement);

    if (value !== undefined) {
      return value ? 'Yes' : 'No';
    }

    if (defaultValue !== undefined) {
      return defaultValue ? 'Yes' : 'No';
    }

    return `{${name}}`;
  }
}
