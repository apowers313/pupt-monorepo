import { Component, type PuptNode, type RenderContext,wrapWithDelimiter } from "@pupt/lib";
import { z } from "zod";

export const referenceSchema = z
    .object({
        title: z.string(),
        url: z.string().optional(),
        description: z.string().optional(),
        delimiter: z.enum(["xml", "markdown", "none"]).optional(),
    })
    .loose();

type ReferenceProps = z.infer<typeof referenceSchema> & { children?: PuptNode };

/**
 * Describes a single reference or source material.
 * Typically used as a child of References.
 *
 * Usage:
 * <Reference title="API Docs" url="https://api.example.com/docs" />
 * <Reference title="Internal Wiki" description="Team conventions" />
 */
export class Reference extends Component<ReferenceProps> {
    static schema = referenceSchema;

    render(props: ReferenceProps, _resolvedValue: undefined, _context: RenderContext): PuptNode {
        const { title, url, description, delimiter = "xml", children } = props;

        const parts: string[] = [];
        parts.push(title);

        if (url) {
            parts.push(`URL: ${url}`);
        }

        if (description) {
            parts.push(description);
        }

        if (this.hasContent(children)) {
            return wrapWithDelimiter([parts.join("\n"), "\n", children], "reference", delimiter);
        }

        return wrapWithDelimiter(parts.join("\n"), "reference", delimiter);
    }
}
