import { z } from "zod";
import { Component, type PuptNode, type RenderContext } from "@pupt/lib";

export const negativeExampleSchema = z
    .object({
        reason: z.string().optional(),
    })
    .passthrough();

type NegativeExampleProps = z.infer<typeof negativeExampleSchema> & { children: PuptNode };

export class NegativeExample extends Component<NegativeExampleProps> {
    static schema = negativeExampleSchema;

    render({ reason, children }: NegativeExampleProps, _resolvedValue: undefined, _context: RenderContext): PuptNode {
        return ["<bad-example>\n", children, reason ? `\nReason this is wrong: ${reason}` : "", "\n</bad-example>\n"];
    }
}
