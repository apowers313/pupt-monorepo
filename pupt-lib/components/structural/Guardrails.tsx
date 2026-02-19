import { Component, type PuptNode, type RenderContext,wrapWithDelimiter } from "@pupt/lib";
import { z } from "zod";

import { STANDARD_GUARDRAILS } from "../presets";

export const guardrailsSchema = z
    .object({
        preset: z.enum(["standard", "strict", "minimal"]).optional(),
        extend: z.boolean().optional(),
        exclude: z.array(z.string()).optional(),
        prohibit: z.array(z.string()).optional(),
        require: z.array(z.string()).optional(),
        delimiter: z.enum(["xml", "markdown", "none"]).optional(),
    })
    .loose();

type GuardrailsProps = z.infer<typeof guardrailsSchema> & { children?: PuptNode };

/**
 * Safety constraints and prohibited actions component.
 * Supports presets, custom prohibitions, and required behaviors.
 *
 * Usage:
 * <Guardrails preset="standard" />
 * <Guardrails preset="standard" prohibit={['Discuss competitors']} />
 * <Guardrails extend require={['Always cite sources']} />
 */
export class Guardrails extends Component<GuardrailsProps> {
    static schema = guardrailsSchema;

    render(props: GuardrailsProps, _resolvedValue: undefined, _context: RenderContext): PuptNode {
        const { preset = "standard", exclude = [], prohibit = [], require = [], delimiter = "xml", children } = props;

        const baseGuardrails = STANDARD_GUARDRAILS[preset] || STANDARD_GUARDRAILS.standard;

        // Filter out excluded guardrails
        const filteredGuardrails =
            exclude.length > 0
                ? baseGuardrails.filter((g) => !exclude.some((e) => g.toLowerCase().includes(e.toLowerCase())))
                : baseGuardrails;

        const sections: string[] = [];

        sections.push("Safety and compliance requirements:");

        // Add base guardrails + required behaviors
        const allRequirements = [...filteredGuardrails, ...require];
        for (const req of allRequirements) {
            sections.push(`- ${req}`);
        }

        // Add prohibitions
        if (prohibit.length > 0) {
            sections.push("");
            sections.push("Prohibited actions:");
            for (const p of prohibit) {
                sections.push(`- Do not: ${p}`);
            }
        }

        const content: PuptNode[] = [sections.join("\n")];

        if (this.hasContent(children)) {
            content.push("\n");
            content.push(children);
        }

        return wrapWithDelimiter(content, "guardrails", delimiter);
    }
}
