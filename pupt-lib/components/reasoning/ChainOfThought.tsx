import { Component, type PuptNode, type RenderContext,wrapWithDelimiter } from "@pupt/lib";
import { z } from "zod";

export const chainOfThoughtSchema = z
    .object({
        style: z.enum(["step-by-step", "think-aloud", "structured", "minimal"]).optional(),
        showReasoning: z.boolean().optional(),
        delimiter: z.enum(["xml", "markdown", "none"]).optional(),
    })
    .loose();

type ChainOfThoughtProps = z.infer<typeof chainOfThoughtSchema> & { children?: PuptNode };

const STYLE_INSTRUCTIONS: Record<string, string> = {
    "step-by-step": "Think through this step by step before providing your answer.",
    "think-aloud": "Reason through your thought process as you work on this.",
    structured: "Break down your reasoning into: 1) Understanding, 2) Analysis, 3) Conclusion.",
    minimal: "Consider the problem carefully before answering.",
};

export class ChainOfThought extends Component<ChainOfThoughtProps> {
    static schema = chainOfThoughtSchema;

    render(props: ChainOfThoughtProps, _resolvedValue: undefined, _context: RenderContext): PuptNode {
        const { style = "step-by-step", showReasoning = true, delimiter = "xml", children } = props;

        const sections: string[] = [];

        if (this.hasContent(children)) {
            // Custom children are used as the reasoning instruction
            // We'll render them directly wrapped in the section
            const parts: PuptNode[] = [children];
            if (showReasoning) {
                parts.push("\nShow your reasoning process.");
            }
            return wrapWithDelimiter(parts, "reasoning", delimiter);
        }

        sections.push(STYLE_INSTRUCTIONS[style]);

        if (showReasoning) {
            sections.push("Show your reasoning process.");
        }

        const content = sections.join("\n");
        return wrapWithDelimiter(content, "reasoning", delimiter);
    }
}
