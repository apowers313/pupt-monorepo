import { Component, type PuptNode, type RenderContext } from "@pupt/lib";
import { z } from "zod";

export const xmlSchema = z
    .object({
        root: z.string().optional(),
    })
    .loose();

type XmlProps = z.infer<typeof xmlSchema> & { children: PuptNode };

export class Xml extends Component<XmlProps> {
    static schema = xmlSchema;

    render({ root = "data", children }: XmlProps, _resolvedValue: undefined, _context: RenderContext): PuptNode {
        return ["```xml\n", `<${root}>\n`, children, `\n</${root}>\n`, "```"];
    }
}
