import { Component, type PuptNode, type RenderContext } from "@pupt/lib";
import { z } from "zod";

export const timestampSchema = z.object({}).loose();

type TimestampProps = z.infer<typeof timestampSchema>;

export class Timestamp extends Component<TimestampProps> {
    static schema = timestampSchema;

    render(_props: TimestampProps, _resolvedValue: undefined, _context: RenderContext): PuptNode {
        // Return Unix timestamp in seconds
        return String(Math.floor(Date.now() / 1000));
    }
}
