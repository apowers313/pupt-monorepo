import { Component, type PuptNode, type RenderContext,wrapWithDelimiter } from "@pupt/lib";
import { z } from "zod";

export const audienceSchema = z
    .object({
        level: z.enum(["beginner", "intermediate", "advanced", "expert", "mixed"]).optional(),
        type: z.enum(["technical", "business", "academic", "general", "children"]).optional(),
        description: z.string().optional(),
        knowledgeLevel: z.string().optional(),
        goals: z.array(z.string()).optional(),
        delimiter: z.enum(["xml", "markdown", "none"]).optional(),
    })
    .passthrough();

type AudienceProps = z.infer<typeof audienceSchema> & { children?: PuptNode };

export class Audience extends Component<AudienceProps> {
    static schema = audienceSchema;

    render(props: AudienceProps, _resolvedValue: undefined, _context: RenderContext): PuptNode {
        const { level, type, description, knowledgeLevel, goals, delimiter = "xml", children } = props;

        // If custom children, use them
        if (this.hasContent(children)) {
            return wrapWithDelimiter(children, "audience", delimiter);
        }

        const sections: string[] = [];

        // Build audience description
        if (level || type) {
            const parts = [level, type].filter(Boolean);
            sections.push(`Target audience: ${parts.join(" ")} users`);
        }

        if (description) {
            sections.push(description);
        }

        if (knowledgeLevel) {
            sections.push(`Assume they know: ${knowledgeLevel}`);
        }

        if (goals && goals.length > 0) {
            sections.push(`Their goals: ${goals.join(", ")}`);
        }

        // Add level-specific guidance
        const guidance = this.getLevelGuidance(level);
        if (guidance) {
            sections.push("");
            sections.push(guidance);
        }

        const content = sections.join("\n");
        return wrapWithDelimiter(content, "audience", delimiter);
    }

    private getLevelGuidance(level?: string): string | null {
        if (!level) {
            return null;
        }
        const guidance: Record<string, string> = {
            beginner: "Use simple language, avoid jargon, and provide analogies where helpful.",
            intermediate: "You can use technical terms but provide brief explanations when needed.",
            advanced: "Use full technical vocabulary and assume strong foundational knowledge.",
            expert: "Communicate as a peer; no need to explain standard concepts.",
            mixed: "Provide multiple levels of explanation when covering technical topics.",
        };
        return guidance[level] ?? null;
    }
}
