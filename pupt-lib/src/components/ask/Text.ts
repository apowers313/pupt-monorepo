import { Component } from '../../component';
import type { PuptNode, RenderContext, InputRequirement } from '../../types';
import { attachRequirement } from './utils';

export interface TextProps {
  name: string;
  label: string;
  description?: string;
  required?: boolean;
  default?: string;
  placeholder?: string;
  children?: PuptNode;
}

// Named AskText to avoid potential bundler conflicts with common identifiers
export class AskText extends Component<TextProps> {
  render(props: TextProps, context: RenderContext): PuptNode {
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
      type: 'string',
      required,
      default: defaultValue,
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
