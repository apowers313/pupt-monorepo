import { Component } from '../../component';
import type { PuptNode, PuptElement, RenderContext, InputRequirement } from '../../types';
import { attachRequirement } from './utils';

export interface MultiSelectOption {
  value: string;
  label: string;
  text?: string;
}

export interface MultiSelectProps {
  name: string;
  label: string;
  description?: string;
  required?: boolean;
  default?: string[];
  options?: MultiSelectOption[];
  min?: number;
  max?: number;
  children?: PuptNode;
}

export class MultiSelect extends Component<MultiSelectProps> {
  render(props: MultiSelectProps, context: RenderContext): PuptNode {
    const {
      name,
      label,
      description = label,
      required = false,
      default: defaultValue,
      options: propOptions = [],
      min,
      max,
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

    const value = context.inputs.get(name) as string[] | undefined;

    const requirement: InputRequirement = {
      name,
      label,
      description,
      type: 'multiselect',
      required,
      default: defaultValue,
      options: allOptions,
      min,
      max,
    };

    attachRequirement(context, requirement);

    // Find display texts for selected values
    const selectedValues = value ?? defaultValue;
    if (selectedValues !== undefined && Array.isArray(selectedValues)) {
      const texts = selectedValues.map((v) => {
        const opt = allOptions.find((o) => o.value === v);
        return opt ? (opt.text ?? opt.label) : v;
      });
      return texts.join(', ');
    }

    return `{${name}}`;
  }
}

function collectOptionsFromChildren(children: PuptNode): MultiSelectOption[] {
  const options: MultiSelectOption[] = [];

  if (!children) return options;

  const childArray = Array.isArray(children) ? children : [children];

  for (const child of childArray) {
    if (!child || typeof child !== 'object' || !('type' in child)) {
      continue;
    }

    const element = child as PuptElement;

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
