import { Component, type PuptNode, type RenderContext,wrapWithDelimiter } from "@pupt/lib";
import { z } from "zod";

export const sectionSchema = z
    .object({
        name: z.string().optional(),
        delimiter: z.enum(["xml", "markdown", "none"]).optional(),
    })
    .passthrough();

type SectionProps = z.infer<typeof sectionSchema> & { children: PuptNode };

export class Section extends Component<SectionProps> {
    static schema = sectionSchema;

    render({ name, delimiter, children }: SectionProps, _resolvedValue: undefined, _context: RenderContext): PuptNode {
        const effectiveDelimiter = delimiter ?? (name ? "xml" : "none");
        const childContent = Array.isArray(children) ? children : children;
        // Default tag name to 'section' if not provided
        const tagName = name ?? "section";

        return wrapWithDelimiter(childContent, tagName, effectiveDelimiter);
    }
}
