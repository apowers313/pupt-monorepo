import {
    CHILDREN,
    Component,
    type InputRequirement,
    isElementOfType,
    isPuptElement,
    PROPS,
    type PuptElement,
    type PuptNode,
    type RenderContext,
} from "@pupt/lib";
import { z } from "zod";

import { askBaseSchema, attachRequirement } from "./utils";

export interface MultiSelectOption {
    value: string;
    label: string;
    text?: string;
}

export const multiSelectOptionSchema = z
    .object({
        value: z.string(),
        label: z.string().optional(),
    })
    .loose();

export const askMultiSelectSchema = askBaseSchema
    .extend({
        default: z.array(z.string()).optional(),
        options: z.array(multiSelectOptionSchema).optional(),
        min: z.number().optional(),
        max: z.number().optional(),
    })
    .loose();

export type MultiSelectProps = z.infer<typeof askMultiSelectSchema> & { children?: PuptNode };

// Named AskMultiSelect for consistent Ask component naming
export class AskMultiSelect extends Component<MultiSelectProps, string[]> {
    static schema = askMultiSelectSchema;

    resolve(props: MultiSelectProps, context: RenderContext): string[] {
        const { name, default: defaultValue } = props;
        const value = context.inputs.get(name) as string[] | undefined;

        if (value !== undefined && Array.isArray(value)) {
            return value;
        }

        if (defaultValue !== undefined && Array.isArray(defaultValue)) {
            return defaultValue;
        }

        return [];
    }

    render(props: MultiSelectProps, resolvedValue: string[] | undefined, context: RenderContext): PuptNode {
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

        const requirement: InputRequirement = {
            name,
            label,
            description,
            type: "multiselect",
            required,
            default: defaultValue,
            options: allOptions,
            min,
            max,
        };

        attachRequirement(context, requirement);

        if (silent) {
            return "";
        }

        // Get actual value - from resolvedValue if available, otherwise compute it
        // (handles input-iterator case where render is called without resolve)
        const actualValue = resolvedValue ?? this.resolve(props, context);

        // Find display texts for values
        if (actualValue.length > 0) {
            const texts = actualValue.map((v) => {
                const opt = allOptions.find((o) => o.value === v);
                return opt ? (opt.text ?? opt.label) : v;
            });
            return texts.join(", ");
        }

        return `{${name}}`;
    }
}

function collectOptionsFromChildren(children: PuptNode): MultiSelectOption[] {
    const options: MultiSelectOption[] = [];

    if (!children) {
        return options;
    }

    const childArray = Array.isArray(children) ? children : [children];

    for (const child of childArray) {
        if (!isPuptElement(child)) {
            continue;
        }

        const element = child as PuptElement;

        if (isElementOfType(element, "AskOption")) {
            const props = element[PROPS] as { value?: string; label?: string; children?: PuptNode };
            const value = props.value ?? "";
            const childText = getTextFromChildren(element[CHILDREN]);
            const label = props.label ?? childText ?? value;
            const text = childText ?? label;

            options.push({ value, label, text });
        }
    }

    return options;
}

function getTextFromChildren(children: PuptNode): string | undefined {
    if (!children) {
        return undefined;
    }
    if (typeof children === "string") {
        return children;
    }
    if (typeof children === "number") {
        return String(children);
    }
    if (Array.isArray(children)) {
        const texts = children.map(getTextFromChildren).filter(Boolean);
        return texts.length > 0 ? texts.join("") : undefined;
    }
    return undefined;
}
