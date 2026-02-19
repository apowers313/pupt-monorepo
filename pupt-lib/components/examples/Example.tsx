import { z } from "zod";
import { Component, type PuptNode, type RenderContext } from "@pupt/lib";
import { ExampleInput } from "./ExampleInput";
import { ExampleOutput } from "./ExampleOutput";

export const exampleSchema = z.object({}).loose();

type ExampleProps = z.infer<typeof exampleSchema> & { children: PuptNode };

export class Example extends Component<ExampleProps> {
    static get Input() {
        return ExampleInput;
    }
    static get Output() {
        return ExampleOutput;
    }
    static schema = exampleSchema;

    render({ children }: ExampleProps, _resolvedValue: undefined, _context: RenderContext): PuptNode {
        return ["<example>\n", children, "\n</example>\n"];
    }
}
