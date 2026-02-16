import { Component, type InputRequirement, type PuptNode, type RenderContext } from "@pupt/lib";
import { z } from "zod";

import { askBaseSchema, attachRequirement } from "./utils";

export const askEditorSchema = askBaseSchema
    .extend({
        default: z.string().optional(),
        language: z.string().optional(),
    })
    .passthrough();

export type EditorProps = z.infer<typeof askEditorSchema> & { children?: PuptNode };

// Named AskEditor for consistent Ask component naming
export class AskEditor extends Component<EditorProps, string> {
    static schema = askEditorSchema;

    resolve(props: EditorProps, context: RenderContext): string {
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

    render(props: EditorProps, resolvedValue: string | undefined, context: RenderContext): PuptNode {
        const {
            name,
            label,
            description = label,
            required = false,
            default: defaultValue,
            language,
            silent = false,
        } = props;

        const requirement: InputRequirement = {
            name,
            label,
            description,
            type: "string",
            required,
            default: defaultValue,
            language,
        };

        attachRequirement(context, requirement);

        if (silent) {
            return "";
        }

        // Get actual value - from resolvedValue if available, otherwise compute it
        return resolvedValue ?? this.resolve(props, context);
    }
}
