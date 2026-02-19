import { Component, type PuptNode, type RenderContext } from "@pupt/lib";
import { z } from "zod";

export const jsonSchema = z
    .object({
        indent: z.number().optional(),
    })
    .loose();

type JsonProps = z.infer<typeof jsonSchema> & { children: unknown };

export class Json extends Component<JsonProps> {
    static schema = jsonSchema;

    render({ indent = 2, children }: JsonProps, _resolvedValue: undefined, _context: RenderContext): PuptNode {
        const jsonString = JSON.stringify(children, null, indent);
        return ["```json\n", jsonString, "\n```"];
    }
}
