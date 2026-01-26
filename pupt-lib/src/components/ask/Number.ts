import { Component } from '../../component';
import type { PuptNode, RenderContext, InputRequirement } from '../../types';
import { attachRequirement } from './utils';

export interface NumberProps {
  name: string;
  label: string;
  description?: string;
  required?: boolean;
  default?: number;
  min?: number;
  max?: number;
  children?: PuptNode;
}

export class Number extends Component<NumberProps> {
  render(props: NumberProps, context: RenderContext): PuptNode {
    const {
      name,
      label,
      description = label,
      required = false,
      default: defaultValue,
      min,
      max,
    } = props;

    const value = context.inputs.get(name);

    const requirement: InputRequirement = {
      name,
      label,
      description,
      type: 'number',
      required,
      default: defaultValue,
      min,
      max,
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
