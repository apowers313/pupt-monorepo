import { Component, type PuptNode, type RenderContext,wrapWithDelimiter } from "@pupt/lib";
import { z } from "zod";

export const fallbackSchema = z
    .object({
        when: z.string(),
        then: z.string(),
        delimiter: z.enum(["xml", "markdown", "none"]).optional(),
    })
    .passthrough();

type FallbackProps = z.infer<typeof fallbackSchema> & { children?: PuptNode };

/**
 * Describes a fallback behavior for a specific situation.
 * Typically used as a child of Fallbacks.
 *
 * Usage:
 * <Fallback when="unable to complete the request" then="explain why and suggest alternatives" />
 */
export class Fallback extends Component<FallbackProps> {
    static schema = fallbackSchema;

    render(props: FallbackProps, _resolvedValue: undefined, _context: RenderContext): PuptNode {
        const { when, then, delimiter = "xml", children } = props;

        const action = this.hasContent(children) ? children : then;
        const content = `If ${when}, then ${String(action as string | number)}`;

        return wrapWithDelimiter(content, "fallback", delimiter);
    }
}
