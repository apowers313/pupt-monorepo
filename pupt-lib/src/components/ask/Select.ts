import { z } from 'zod';
import { Component } from '../../component';
import type { PuptNode, PuptElement, RenderContext, InputRequirement } from '../../types';
import { isPuptElement } from '../../types/element';
import { TYPE, PROPS, CHILDREN } from '../../types/symbols';
import { attachRequirement, askBaseSchema } from './utils';

export interface SelectOption {
  value: string;
  label: string;
  text?: string;
}

export const selectOptionSchema = z.object({
  value: z.string(),
  label: z.string().optional(),
}).passthrough();

export const askSelectSchema = askBaseSchema.extend({
  default: z.string().optional(),
  options: z.array(selectOptionSchema).optional(),
}).passthrough();

export type SelectProps = z.infer<typeof askSelectSchema> & { children?: PuptNode };

// Named AskSelect for consistent Ask component naming
export class AskSelect extends Component<SelectProps, string> {
  static schema = askSelectSchema;

  resolve(props: SelectProps, context: RenderContext): string {
    const { name, default: defaultValue } = props;
    const value = context.inputs.get(name);

    if (value !== undefined) {
      return String(value);
    }

    if (defaultValue !== undefined) {
      return defaultValue;
    }

    return '';
  }

  render(props: SelectProps, resolvedValue: string | undefined, context: RenderContext): PuptNode {
    const {
      name,
      label,
      description = label,
      required = false,
      default: defaultValue,
      options: propOptions = [],
      children,
      silent = false,
    } = props;

    // Collect options from Option children
    const childOptions = collectOptionsFromChildren(children);

    // Merge: children first, then prop options
    const allOptions = [...childOptions, ...propOptions].map((opt) => ({
      value: opt.value,
      label: opt.label ?? opt.value,
      text: (opt.text ?? opt.label ?? opt.value) as string,
    }));

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

    if (silent) {
      return '';
    }

    // Get actual value - from resolvedValue if available, otherwise compute it
    const actualValue = resolvedValue ?? this.resolve(props, context);

    // Find the display text for the actual value
    if (actualValue) {
      const selectedOption = allOptions.find((opt) => opt.value === actualValue);
      if (selectedOption) {
        return String(selectedOption.text ?? selectedOption.label);
      }
      return actualValue;
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
    if (!isPuptElement(child)) {
      continue;
    }

    const element = child as PuptElement;
    const elementType = element[TYPE];

    // Check if this is an Option component (by type name or function name)
    const isOption =
      elementType === 'AskOption' ||
      (typeof elementType === 'function' && elementType.name === 'AskOption');

    if (isOption) {
      const props = element[PROPS] as { value?: string; label?: string; children?: PuptNode };
      const value = props.value ?? '';
      const childText = getTextFromChildren(element[CHILDREN]);
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
