import { Component, type PuptNode, type RenderContext } from "@pupt/lib";
import { z } from "zod";

export const askOptionSchema = z
    .object({
        value: z.string(),
    })
    .passthrough();

export type OptionProps = z.infer<typeof askOptionSchema> & { children?: PuptNode };

/**
 * Option component for use within Select/MultiSelect.
 * This is a marker component - it doesn't render directly.
 * The parent Select/MultiSelect component processes the options.
 */
// Named AskOption for consistent Ask component naming
export class AskOption extends Component<OptionProps> {
    static schema = askOptionSchema;
    render(_props: OptionProps, _resolvedValue: undefined, _context: RenderContext): PuptNode {
        // Options don't render directly - they're collected by parent Select
        return null;
    }
}
