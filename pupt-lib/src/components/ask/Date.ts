import { Component } from '../../component';
import type { PuptNode, RenderContext, InputRequirement } from '../../types';
import { attachRequirement } from './utils';

export interface DateProps {
  name: string;
  label: string;
  description?: string;
  required?: boolean;
  default?: string;
  includeTime?: boolean;
  minDate?: string;
  maxDate?: string;
  children?: PuptNode;
}

// Named AskDate to avoid collision with JavaScript's Date global
export class AskDate extends Component<DateProps> {
  render(props: DateProps, context: RenderContext): PuptNode {
    const {
      name,
      label,
      description = label,
      required = false,
      default: defaultValue,
      includeTime = false,
      minDate,
      maxDate,
    } = props;

    const value = context.inputs.get(name);

    const requirement: InputRequirement = {
      name,
      label,
      description,
      type: 'date',
      required,
      default: defaultValue,
      includeTime,
      minDate,
      maxDate,
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
