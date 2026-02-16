import { z } from "zod";
import { Component, type PuptNode, type RenderContext } from "@pupt/lib";

export const exampleOutputSchema = z.object({}).passthrough();

type ExampleOutputProps = z.infer<typeof exampleOutputSchema> & { children: PuptNode };

export class ExampleOutput extends Component<ExampleOutputProps> {
    static schema = exampleOutputSchema;

    render({ children }: ExampleOutputProps, _resolvedValue: undefined, _context: RenderContext): PuptNode {
        return ["<output>\n", children, "\n</output>"];
    }
}
