import { Component, type PuptNode, type RenderContext,wrapWithDelimiter } from "@pupt/lib";
import { z } from "zod";

export const specializationSchema = z
    .object({
        areas: z.union([z.string(), z.array(z.string())]),
        level: z.enum(["familiar", "proficient", "expert", "authority"]).optional(),
        delimiter: z.enum(["xml", "markdown", "none"]).optional(),
    })
    .passthrough();

type SpecializationProps = z.infer<typeof specializationSchema> & { children?: PuptNode };

export class Specialization extends Component<SpecializationProps> {
    static schema = specializationSchema;

    render(props: SpecializationProps, _resolvedValue: undefined, _context: RenderContext): PuptNode {
        const { areas, level, delimiter = "xml", children } = props;

        if (this.hasContent(children)) {
            return wrapWithDelimiter(children, "specialization", delimiter);
        }

        const areaList = Array.isArray(areas) ? areas : [areas];
        const sections: string[] = [];

        if (level) {
            sections.push(`Expertise level: ${level}`);
        }

        if (areaList.length === 1) {
            sections.push(`Specialization: ${areaList[0]}`);
        } else {
            sections.push("Areas of specialization:");
            for (const area of areaList) {
                sections.push(`- ${area}`);
            }
        }

        const content = sections.join("\n");
        return wrapWithDelimiter(content, "specialization", delimiter);
    }
}
