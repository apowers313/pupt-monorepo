import { Component, type PuptNode, type RenderContext,wrapWithDelimiter } from "@pupt/lib";
import { z } from "zod";

import { FALLBACK_PRESETS } from "../presets";

export const fallbacksSchema = z
    .object({
        extend: z.boolean().optional(),
        preset: z.enum(["standard"]).optional(),
        delimiter: z.enum(["xml", "markdown", "none"]).optional(),
    })
    .passthrough();

type FallbacksProps = z.infer<typeof fallbacksSchema> & { children?: PuptNode };

/**
 * Container component for fallback behaviors.
 * Groups Fallback children that describe when/then pairs.
 *
 * Usage:
 * <Fallbacks>
 *   <Fallback when="unable to complete" then="explain why" />
 * </Fallbacks>
 * <Fallbacks preset="standard" />
 */
export class Fallbacks extends Component<FallbacksProps> {
    static schema = fallbacksSchema;

    render(props: FallbacksProps, _resolvedValue: undefined, _context: RenderContext): PuptNode {
        const { preset, delimiter = "xml", children } = props;

        const parts: PuptNode[] = [];

        // Add preset fallbacks
        if (preset) {
            const presetFallbacks = FALLBACK_PRESETS[preset];
            if (presetFallbacks) {
                for (const { when, then } of presetFallbacks) {
                    parts.push(`If ${when}, then ${then}`);
                    parts.push("\n");
                }
            }
        }

        // Add children (Fallback components)
        if (this.hasContent(children)) {
            parts.push(children);
        }

        if (parts.length === 0) {
            return "";
        }

        return wrapWithDelimiter(parts, "fallbacks", delimiter);
    }
}
