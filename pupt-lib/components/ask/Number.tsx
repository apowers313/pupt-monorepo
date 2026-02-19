import { Component, type InputRequirement, type PuptNode, type RenderContext } from "@pupt/lib";
import { z } from "zod";

import { askBaseSchema, attachRequirement } from "./utils";

export const askNumberSchema = askBaseSchema
    .extend({
        default: z.number().optional(),
        min: z.number().optional(),
        max: z.number().optional(),
    })
    .loose();

export type NumberProps = z.infer<typeof askNumberSchema> & { children?: PuptNode };

// Named AskNumber to avoid collision with JavaScript's Number global
export class AskNumber extends Component<NumberProps, number> {
    static schema = askNumberSchema;

    resolve(props: NumberProps, context: RenderContext): number {
        const { name, default: defaultValue } = props;
        const value = context.inputs.get(name);

        if (value !== undefined) {
            return typeof value === "number" ? value : Number(value);
        }

        if (defaultValue !== undefined) {
            return defaultValue;
        }

        return NaN;
    }

    render(props: NumberProps, resolvedValue: number | undefined, context: RenderContext): PuptNode {
        const {
            name,
            label,
            description = label,
            required = false,
            default: defaultValue,
            min,
            max,
            silent = false,
        } = props;

        const requirement: InputRequirement = {
            name,
            label,
            description,
            type: "number",
            required,
            default: defaultValue,
            min,
            max,
        };

        attachRequirement(context, requirement);

        if (silent) {
            return "";
        }

        // Get actual value - from resolvedValue if available, otherwise compute it
        const actualValue = resolvedValue ?? this.resolve(props, context);

        if (Number.isNaN(actualValue)) {
            return `{${name}}`;
        }

        return String(actualValue);
    }
}
