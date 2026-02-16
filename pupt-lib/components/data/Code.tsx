import { Component, type PuptNode, type RenderContext } from "@pupt/lib";
import { z } from "zod";

export const codeSchema = z
    .object({
        language: z.string().optional(),
        filename: z.string().optional(),
    })
    .passthrough();

type CodeProps = z.infer<typeof codeSchema> & { children: PuptNode };

export class Code extends Component<CodeProps> {
    static schema = codeSchema;

    render(
        { language = "", filename, children }: CodeProps,
        _resolvedValue: undefined,
        _context: RenderContext,
    ): PuptNode {
        const parts: PuptNode[] = [];

        if (filename) {
            parts.push(`<!-- ${filename} -->\n`);
        }

        parts.push(`\`\`\`${language}\n`);
        parts.push(children);
        parts.push("\n```");

        return parts;
    }
}
