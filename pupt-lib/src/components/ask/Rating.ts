import { Component } from '../../component';
import type { PuptNode, PuptElement, RenderContext, InputRequirement } from '../../types';
import { attachRequirement } from './utils';

export interface RatingProps {
  name: string;
  label: string;
  description?: string;
  required?: boolean;
  default?: number;
  min?: number;
  max?: number;
  labels?: Record<number, string>;
  children?: PuptNode;
}

// Named AskRating for consistent Ask component naming
export class AskRating extends Component<RatingProps> {
  render(props: RatingProps, context: RenderContext): PuptNode {
    const {
      name,
      label,
      description = label,
      required = false,
      default: defaultValue,
      min = 1,
      max = 5,
      labels: propLabels = {},
      children,
    } = props;

    // Collect labels from Label children
    const childLabels = collectLabelsFromChildren(children);

    // Merge: prop labels override child labels
    const allLabels = { ...childLabels, ...propLabels };

    const value = context.inputs.get(name) as number | undefined;

    const requirement: InputRequirement = {
      name,
      label,
      description,
      type: 'rating',
      required,
      default: defaultValue,
      min,
      max,
      labels: allLabels,
    };

    attachRequirement(context, requirement);

    const selectedValue = value ?? defaultValue;
    if (selectedValue !== undefined) {
      // If there's a label for this value, render it; otherwise render the number
      const labelText = allLabels[selectedValue];
      if (labelText) {
        return `${selectedValue} (${labelText})`;
      }
      return String(selectedValue);
    }

    return `{${name}}`;
  }
}

function collectLabelsFromChildren(children: PuptNode): Record<number, string> {
  const labels: Record<number, string> = {};

  if (!children) return labels;

  const childArray = Array.isArray(children) ? children : [children];

  for (const child of childArray) {
    if (!child || typeof child !== 'object' || !('type' in child)) {
      continue;
    }

    const element = child as PuptElement;

    const isLabel =
      element.type === 'AskLabel' ||
      (typeof element.type === 'function' && element.type.name === 'AskLabel');

    if (isLabel) {
      const props = element.props as { value?: number | string; children?: PuptNode };
      const value = typeof props.value === 'string' ? parseInt(props.value, 10) : props.value;
      const text = getTextFromChildren(element.children);

      if (value !== undefined && !isNaN(value) && text) {
        labels[value] = text;
      }
    }
  }

  return labels;
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
