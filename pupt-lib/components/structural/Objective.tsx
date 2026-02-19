import { Component, type PuptNode, type RenderContext,wrapWithDelimiter } from "@pupt/lib";
import { z } from "zod";

export const objectiveSchema = z
    .object({
        primary: z.string(),
        secondary: z.array(z.string()).optional(),
        metrics: z.array(z.string()).optional(),
        delimiter: z.enum(["xml", "markdown", "none"]).optional(),
    })
    .loose();

type ObjectiveProps = z.infer<typeof objectiveSchema> & { children?: PuptNode };

export class Objective extends Component<ObjectiveProps> {
    static schema = objectiveSchema;

    render(props: ObjectiveProps, _resolvedValue: undefined, _context: RenderContext): PuptNode {
        const { primary, secondary = [], metrics = [], delimiter = "xml", children } = props;

        if (this.hasContent(children)) {
            return wrapWithDelimiter(children, "objective", delimiter);
        }

        const sections: string[] = [];

        sections.push(`Primary goal: ${primary}`);

        if (secondary.length > 0) {
            sections.push("");
            sections.push("Secondary goals:");
            for (const goal of secondary) {
                sections.push(`- ${goal}`);
            }
        }

        if (metrics.length > 0) {
            sections.push("");
            sections.push("Success metrics:");
            for (const metric of metrics) {
                sections.push(`- ${metric}`);
            }
        }

        const content = sections.join("\n");
        return wrapWithDelimiter(content, "objective", delimiter);
    }
}
