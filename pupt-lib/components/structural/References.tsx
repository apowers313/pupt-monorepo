import { Component, type PuptNode, type RenderContext,wrapWithDelimiter } from "@pupt/lib";
import { z } from "zod";

const sourceSchema = z.object({
    title: z.string(),
    url: z.string().optional(),
    description: z.string().optional(),
});

export const referencesSchema = z
    .object({
        extend: z.boolean().optional(),
        sources: z.array(sourceSchema).optional(),
        style: z.enum(["inline", "footnote", "bibliography"]).optional(),
        delimiter: z.enum(["xml", "markdown", "none"]).optional(),
    })
    .loose();

type ReferencesProps = z.infer<typeof referencesSchema> & { children?: PuptNode };

/**
 * Container component for reference materials and sources.
 * Can include Reference children and/or a sources array.
 *
 * Usage:
 * <References sources={[{ title: 'API Docs', url: 'https://...' }]}>
 *   <Reference title="Internal Wiki" description="Team conventions" />
 * </References>
 */
export class References extends Component<ReferencesProps> {
    static schema = referencesSchema;

    render(props: ReferencesProps, _resolvedValue: undefined, _context: RenderContext): PuptNode {
        const { sources = [], style = "inline", delimiter = "xml", children } = props;

        const parts: PuptNode[] = [];

        // Add sources from the sources prop
        if (sources.length > 0) {
            for (const source of sources) {
                const sourceParts: string[] = [source.title];
                if (source.url) {
                    sourceParts.push(`URL: ${source.url}`);
                }
                if (source.description) {
                    sourceParts.push(source.description);
                }

                if (style === "bibliography") {
                    parts.push(`- ${sourceParts.join(" — ")}`);
                } else if (style === "footnote") {
                    parts.push(`[${source.title}]${source.url ? ` ${source.url}` : ""}`);
                } else {
                    // inline (default)
                    parts.push(sourceParts.join("\n"));
                }
                parts.push("\n");
            }
        }

        // Add children (Reference components)
        if (this.hasContent(children)) {
            parts.push(children);
        }

        if (parts.length === 0) {
            return "";
        }

        return wrapWithDelimiter(parts, "references", delimiter);
    }
}
