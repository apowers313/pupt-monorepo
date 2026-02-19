import { Component, type PuptNode, type RenderContext,wrapWithDelimiter } from "@pupt/lib";
import { z } from "zod";

export const contextSchema = z
    .object({
        type: z
            .enum(["background", "situational", "domain", "data", "historical", "reference", "constraints", "user"])
            .optional(),
        label: z.string().optional(),
        source: z.string().optional(),
        priority: z.enum(["critical", "important", "helpful", "optional"]).optional(),
        relevance: z.string().optional(),
        delimiter: z.enum(["xml", "markdown", "none"]).optional(),
        truncate: z.boolean().optional(),
        maxTokens: z.number().optional(),
        preserveFormatting: z.boolean().optional(),
    })
    .loose();

type ContextProps = z.infer<typeof contextSchema> & { children?: PuptNode };

export class Context extends Component<ContextProps> {
    static schema = contextSchema;

    render(props: ContextProps, _resolvedValue: undefined, _context: RenderContext): PuptNode {
        const {
            label,
            source,
            relevance,
            delimiter = "xml",
            truncate,
            maxTokens,
            preserveFormatting,
            children,
        } = props;

        const sections: PuptNode[] = [];

        // Label if provided
        if (label) {
            sections.push(`[${label}]\n`);
        }

        // Relevance hint
        if (relevance) {
            sections.push(`(Relevant because: ${relevance})\n\n`);
        }

        // Content handling hints
        if (maxTokens !== undefined) {
            sections.push(`(max tokens: ${maxTokens})\n`);
        }

        if (preserveFormatting) {
            sections.push("(preserve formatting)\n");
        }

        if (truncate) {
            sections.push("[may be truncated]\n");
        }

        // Main content
        if (this.hasContent(children)) {
            sections.push(children);
        }

        // Source attribution
        if (source) {
            sections.push(`\n\n(Source: ${source})`);
        }

        const content = sections.length === 1 ? sections[0] : sections;
        return wrapWithDelimiter(content, "context", delimiter);
    }
}
