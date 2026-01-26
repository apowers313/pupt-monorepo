import { Component } from '../../component';
import type { PuptNode, RenderContext, InputRequirement } from '../../types';
import { attachRequirement } from './utils';

export interface ChoiceOption {
  value: string;
  label: string;
}

export interface ChoiceProps {
  name: string;
  label: string;
  description?: string;
  required?: boolean;
  default?: string;
  options: [ChoiceOption, ChoiceOption];  // Exactly 2 options
  children?: PuptNode;
}

export class Choice extends Component<ChoiceProps> {
  render(props: ChoiceProps, context: RenderContext): PuptNode {
    const {
      name,
      label,
      description = label,
      required = false,
      default: defaultValue,
      options,
    } = props;

    const value = context.inputs.get(name);

    const requirement: InputRequirement = {
      name,
      label,
      description,
      type: 'select',  // Choice is a specialized select with exactly 2 options
      required,
      default: defaultValue,
      options: options.map((opt) => ({
        value: opt.value,
        label: opt.label,
        text: opt.label,
      })),
    };

    attachRequirement(context, requirement);

    const selectedValue = value ?? defaultValue;
    if (selectedValue !== undefined) {
      const selectedOption = options.find((opt) => opt.value === selectedValue);
      if (selectedOption) {
        return selectedOption.label;
      }
      return String(selectedValue);
    }

    return `{${name}}`;
  }
}
