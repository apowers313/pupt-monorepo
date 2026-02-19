import { Component, type PuptNode,wrapWithDelimiter } from "@pupt/lib";
import { z } from "zod";

import { CONSTRAINT_PRESETS } from "../presets";

const constraintsSchema = z
    .object({
        extend: z.boolean().optional(),
        exclude: z.array(z.string()).optional(),
        presets: z.array(z.string()).optional(),
        delimiter: z.enum(["xml", "markdown", "none"]).optional(),
    })
    .loose();

type ConstraintsProps = z.infer<typeof constraintsSchema> & { children?: PuptNode };

/**
 * Container component that groups Constraint children.
 * Supports additive composition when used inside Prompt:
 * - No props: replaces default constraints entirely
 * - extend={true}: merges with default constraints
 * - exclude={['preset-name']}: removes specific defaults
 * - presets={['be-concise']}: auto-generates Constraint elements from presets
 */
export class Constraints extends Component<ConstraintsProps> {
    static schema = constraintsSchema;

    render(props: ConstraintsProps): PuptNode {
        const { presets, delimiter = "xml", children } = props;

        const parts: PuptNode[] = [];

        // Add children constraints
        if (this.hasContent(children)) {
            parts.push(children);
        }

        // Add preset constraints
        if (presets && presets.length > 0) {
            for (const presetName of presets) {
                const config = CONSTRAINT_PRESETS[presetName];
                if (config) {
                    parts.push(
                        wrapWithDelimiter([`${config.level.toUpperCase()}: `, config.text], "constraint", delimiter),
                    );
                }
            }
        }

        // If this is used standalone (not inside Prompt composition), wrap in constraints tag
        const content = parts.length === 1 ? parts[0] : parts;
        return wrapWithDelimiter(content, "constraints", delimiter);
    }
}
