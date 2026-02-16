import {
    CHILDREN,
    Component,
    type InputRequirement,
    isPuptElement,
    PROPS,
    type PuptElement,
    type PuptNode,
    type RenderContext,
    TYPE,
} from "@pupt/lib";
import { z } from "zod";

import { askBaseSchema, attachRequirement } from "./utils";

export const askRatingSchema = askBaseSchema
    .extend({
        default: z.number().optional(),
        min: z.number().optional(),
        max: z.number().optional(),
        labels: z.record(z.string(), z.string()).optional(),
    })
    .passthrough();

export type RatingProps = z.infer<typeof askRatingSchema> & { children?: PuptNode };

// Named AskRating for consistent Ask component naming
export class AskRating extends Component<RatingProps, number> {
    static schema = askRatingSchema;

    resolve(props: RatingProps, context: RenderContext): number {
        const { name, default: defaultValue } = props;
        const value = context.inputs.get(name) as number | undefined;

        if (value !== undefined) {
            return typeof value === "number" ? value : Number(value);
        }

        if (defaultValue !== undefined) {
            return defaultValue;
        }

        return 0;
    }

    render(props: RatingProps, resolvedValue: number, context: RenderContext): PuptNode {
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
            silent = false,
        } = props;

        // Collect labels from Label children
        const childLabels = collectLabelsFromChildren(children);

        // Merge: prop labels override child labels
        const allLabels = { ...childLabels, ...propLabels };

        const requirement: InputRequirement = {
            name,
            label,
            description,
            type: "rating",
            required,
            default: defaultValue,
            min,
            max,
            labels: allLabels,
        };

        attachRequirement(context, requirement);

        if (silent) {
            return "";
        }

        // Get actual value - from resolvedValue if available, otherwise compute it
        const actualValue = resolvedValue ?? this.resolve(props, context);

        if (actualValue === 0 && defaultValue === undefined) {
            return `{${name}}`;
        }

        // If there's a label for this value, render it; otherwise render the number
        const labelText = (allLabels as Record<number, string>)[actualValue];
        if (labelText) {
            return `${actualValue} (${labelText})`;
        }
        return String(actualValue);
    }
}

function collectLabelsFromChildren(children: PuptNode): Record<number, string> {
    const labels: Record<number, string> = {};

    if (!children) {
        return labels;
    }

    const childArray = Array.isArray(children) ? children : [children];

    for (const child of childArray) {
        if (!isPuptElement(child)) {
            continue;
        }

        const element = child as PuptElement;
        const elementType = element[TYPE];

        const isLabel =
            elementType === "AskLabel" || (typeof elementType === "function" && elementType.name === "AskLabel");

        if (isLabel) {
            const props = element[PROPS] as { value?: number | string; children?: PuptNode };
            const value = typeof props.value === "string" ? parseInt(props.value, 10) : props.value;
            const text = getTextFromChildren(element[CHILDREN]);

            if (value !== undefined && !isNaN(value) && text) {
                labels[value] = text;
            }
        }
    }

    return labels;
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
