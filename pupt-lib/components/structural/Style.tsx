import { Component, type PuptNode, type RenderContext,wrapWithDelimiter } from "@pupt/lib";
import { z } from "zod";

export const styleSchema = z
    .object({
        type: z.enum(["concise", "detailed", "academic", "casual", "technical", "simple"]).optional(),
        verbosity: z.enum(["minimal", "moderate", "verbose"]).optional(),
        formality: z.enum(["formal", "semi-formal", "informal"]).optional(),
        delimiter: z.enum(["xml", "markdown", "none"]).optional(),
    })
    .passthrough();

type StyleProps = z.infer<typeof styleSchema> & { children?: PuptNode };

export class Style extends Component<StyleProps> {
    static schema = styleSchema;

    render(props: StyleProps, _resolvedValue: undefined, _context: RenderContext): PuptNode {
        const { type, verbosity, formality, delimiter = "xml", children } = props;

        if (this.hasContent(children)) {
            return wrapWithDelimiter(children, "style", delimiter);
        }

        const sections: string[] = [];

        if (type) {
            sections.push(`Writing style: ${type}`);
            const description = this.getStyleDescription(type);
            if (description) {
                sections.push(description);
            }
        }

        if (verbosity) {
            sections.push(`Verbosity: ${verbosity}`);
        }

        if (formality) {
            sections.push(`Formality: ${formality}`);
        }

        const content = sections.join("\n");
        return wrapWithDelimiter(content, "style", delimiter);
    }

    private getStyleDescription(type: string): string | null {
        const descriptions: Record<string, string> = {
            concise: "Be brief and to the point. Avoid unnecessary words.",
            detailed: "Provide thorough explanations with examples and context.",
            academic: "Use scholarly precision with citations and formal structure.",
            casual: "Write in a relaxed, conversational manner.",
            technical: "Use precise technical terminology and structured formatting.",
            simple: "Use plain language accessible to all readers.",
        };
        return descriptions[type] ?? null;
    }
}
