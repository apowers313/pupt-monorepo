import { z } from "zod";
import { Component, type PuptNode, type RenderContext } from "@pupt/lib";

export const exampleInputSchema = z.object({}).passthrough();

type ExampleInputProps = z.infer<typeof exampleInputSchema> & { children: PuptNode };

export class ExampleInput extends Component<ExampleInputProps> {
    static schema = exampleInputSchema;

    render({ children }: ExampleInputProps, _resolvedValue: undefined, _context: RenderContext): PuptNode {
        return ["<input>\n", children, "\n</input>"];
    }
}
