import { Component, type PuptNode, type RenderContext } from "@pupt/lib";
import { z } from "zod";

export const uuidSchema = z.object({}).passthrough();

type UUIDProps = z.infer<typeof uuidSchema>;

export class UUID extends Component<UUIDProps> {
    static schema = uuidSchema;

    render(_props: UUIDProps, _resolvedValue: undefined, _context: RenderContext): PuptNode {
        // Generate a v4 UUID
        return crypto.randomUUID();
    }
}
