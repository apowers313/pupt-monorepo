import { Component } from '../../component';
import type { PuptNode, PuptElement, RenderContext, InputRequirement } from '../../types';
import { attachRequirement } from './utils';

export interface SelectOption {
  value: string;
  label: string;
  text?: string;
}

export interface SelectProps {
  name: string;
  label: string;
  description?: string;
  required?: boolean;
  default?: string;
  options?: SelectOption[];
  children?: PuptNode;
}

export class Select extends Component<SelectProps> {
  render(props: SelectProps, context: RenderContext): PuptNode {
    const {
      name,
      label,
      description = label,
      required = false,
      default: defaultValue,
      options: propOptions = [],
      children,
    } = props;

    // Collect options from Option children
    const childOptions = collectOptionsFromChildren(children);

    // Merge: children first, then prop options
    const allOptions = [...childOptions, ...propOptions].map((opt) => ({
      value: opt.value,
      label: opt.label,
      text: opt.text ?? opt.label,
    }));

    // Check if input was provided
    const value = context.inputs.get(name);

    // Build the requirement (used by InputIterator)
    const requirement: InputRequirement = {
      name,
      label,
      description,
      type: 'select',
      required,
      default: defaultValue,
      options: allOptions,
    };

    // Attach requirement to context for iterator to collect
    attachRequirement(context, requirement);

    // Find the display text for the selected value
    const selectedValue = value ?? defaultValue;
    if (selectedValue !== undefined) {
      const selectedOption = allOptions.find((opt) => opt.value === selectedValue);
      if (selectedOption) {
        return selectedOption.text ?? selectedOption.label;
      }
      return String(selectedValue);
    }

    // No value provided - show placeholder for debugging
    return `{${name}}`;
  }
}

// Extract options from Option children
function collectOptionsFromChildren(children: PuptNode): SelectOption[] {
  const options: SelectOption[] = [];

  if (!children) return options;

  const childArray = Array.isArray(children) ? children : [children];

  for (const child of childArray) {
    if (!child || typeof child !== 'object' || !('type' in child)) {
      continue;
    }

    const element = child as PuptElement;

    // Check if this is an Option component (by type name or function name)
    const isOption =
      element.type === 'Option' ||
      (typeof element.type === 'function' && element.type.name === 'Option');

    if (isOption) {
      const props = element.props as { value?: string; label?: string; children?: PuptNode };
      const value = props.value ?? '';
      const childText = getTextFromChildren(element.children);
      const label = props.label ?? childText ?? value;
      const text = childText ?? label;

      options.push({ value, label, text });
    }
  }

  return options;
}

// Get text content from children
function getTextFromChildren(children: PuptNode): string | undefined {
  if (!children) return undefined;
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) {
    const texts = children.map(getTextFromChildren).filter(Boolean);
    return texts.length > 0 ? texts.join('') : undefined;
  }
  return undefined;
}
