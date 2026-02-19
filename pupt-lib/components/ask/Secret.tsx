import { Component, type InputRequirement, type PuptNode, type RenderContext } from "@pupt/lib";
import { z } from "zod";

import { askBaseSchema, attachRequirement } from "./utils";

export const askSecretSchema = askBaseSchema
    .extend({
        default: z.string().optional(),
        validator: z.string().optional(),
    })
    .loose();

export type SecretProps = z.infer<typeof askSecretSchema> & { children?: PuptNode };

// Named AskSecret for consistent Ask component naming
export class AskSecret extends Component<SecretProps, string> {
    static schema = askSecretSchema;

    resolve(props: SecretProps, context: RenderContext): string {
        const { name, default: defaultValue } = props;
        const value = context.inputs.get(name);

        if (value !== undefined) {
            return String(value as string | number);
        }

        if (defaultValue !== undefined) {
            return defaultValue;
        }

        return `{${name}}`;
    }

    render(props: SecretProps, resolvedValue: string | undefined, context: RenderContext): PuptNode {
        const { name, label, description = label, required = false, default: defaultValue, silent = false } = props;

        const requirement: InputRequirement = {
            name,
            label,
            description,
            type: "secret",
            required,
            default: defaultValue,
            masked: true,
        };

        attachRequirement(context, requirement);

        if (silent) {
            return "";
        }

        // Note: In real usage, you may want to mask or omit the value
        // For now, we render it (the consuming application should handle masking in logs)
        // Get actual value - from resolvedValue if available, otherwise compute it
        return resolvedValue ?? this.resolve(props, context);
    }
}
