import { Component, type PuptNode, type RenderContext } from "@pupt/lib";
import { z } from "zod";

export const cwdSchema = z.object({}).loose();

type CwdProps = z.infer<typeof cwdSchema>;

export class Cwd extends Component<CwdProps> {
    static schema = cwdSchema;

    render(_props: CwdProps, _resolvedValue: undefined, _context: RenderContext): PuptNode {
        return process.cwd();
    }
}
