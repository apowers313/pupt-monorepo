import { Component, type InputRequirement, type PuptNode, type RenderContext } from "@pupt/lib";
import { z } from "zod";

import { askBaseSchema, attachRequirement } from "./utils";

export const askPathSchema = askBaseSchema
    .extend({
        default: z.string().optional(),
        mustExist: z.boolean().optional(),
        mustBeDirectory: z.boolean().optional(),
    })
    .passthrough();

export type PathProps = z.infer<typeof askPathSchema> & { children?: PuptNode };

// Named AskPath for consistent Ask component naming
export class AskPath extends Component<PathProps, string> {
    static schema = askPathSchema;

    resolve(props: PathProps, context: RenderContext): string {
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

    render(props: PathProps, resolvedValue: string | undefined, context: RenderContext): PuptNode {
        const {
            name,
            label,
            description = label,
            required = false,
            default: defaultValue,
            mustExist = false,
            mustBeDirectory = false,
            silent = false,
        } = props;

        const requirement: InputRequirement = {
            name,
            label,
            description,
            type: "path",
            required,
            default: defaultValue,
            mustExist,
            mustBeDirectory,
        };

        attachRequirement(context, requirement);

        if (silent) {
            return "";
        }

        // Get actual value - from resolvedValue if available, otherwise compute it
        return resolvedValue ?? this.resolve(props, context);
    }
}
