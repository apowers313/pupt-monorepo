import { z } from "zod";
import { Component, type PuptNode, type RenderContext } from "@pupt/lib";

export const examplesSchema = z.object({}).loose();

type ExamplesProps = z.infer<typeof examplesSchema> & { children: PuptNode };

export class Examples extends Component<ExamplesProps> {
    static schema = examplesSchema;

    render({ children }: ExamplesProps, _resolvedValue: undefined, _context: RenderContext): PuptNode {
        return ["<examples>\n", children, "</examples>\n"];
    }
}
