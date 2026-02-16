import { Component, type PuptNode, type RenderContext,wrapWithDelimiter } from "@pupt/lib";
import { z } from "zod";

import { PROVIDER_ADAPTATIONS } from "../presets";

export const formatSchema = z
    .object({
        type: z.enum(["json", "markdown", "xml", "text", "code", "yaml", "csv", "list", "table"]).optional(),
        language: z.string().optional(),
        schema: z.union([z.string(), z.record(z.unknown())]).optional(),
        template: z.string().optional(),
        example: z.string().optional(),
        strict: z.boolean().optional(),
        validate: z.boolean().optional(),
        maxLength: z.union([z.string(), z.number()]).optional(),
        minLength: z.union([z.string(), z.number()]).optional(),
        delimiter: z.enum(["xml", "markdown", "none"]).optional(),
    })
    .passthrough();

type FormatProps = z.infer<typeof formatSchema> & { children?: PuptNode };

export class Format extends Component<FormatProps> {
    static schema = formatSchema;

    render(props: FormatProps, _resolvedValue: undefined, context: RenderContext): PuptNode {
        const {
            type,
            language,
            schema,
            template,
            example,
            strict,
            validate,
            maxLength,
            minLength,
            delimiter = "xml",
            children,
        } = props;

        // If children provided without type, just wrap children
        if (this.hasContent(children) && !type) {
            return wrapWithDelimiter(children, "format", delimiter);
        }

        const provider = this.getProvider(context);
        const preferredFormat = this.getPreferredFormat(type, provider);

        const sections: PuptNode[] = [];

        // Format type instruction
        const formatDescription = language ? `${preferredFormat} (${language})` : preferredFormat;
        sections.push(`Output format: ${formatDescription}`);

        // Schema if provided
        if (schema) {
            const schemaStr = typeof schema === "string" ? schema : JSON.stringify(schema, null, 2);
            sections.push(`\n\nSchema:\n\`\`\`json\n${schemaStr}\n\`\`\``);
        }

        // Template if provided
        if (template) {
            sections.push(`\n\nFollow this structure:\n${template}`);
        }

        // Example if provided
        if (example) {
            sections.push(`\n\nExample output:\n${example}`);
        }

        // Length constraints
        if (maxLength) {
            sections.push(`\n\nMaximum length: ${maxLength} characters.`);
        }
        if (minLength) {
            sections.push(`\n\nMinimum length: ${minLength} characters.`);
        }

        // Strict mode instruction
        if (strict) {
            sections.push("\n\nReturn ONLY the formatted output with no additional text or explanation.");
        }

        // Validate instruction
        if (validate) {
            sections.push("\n\nValidate your output matches the specified format before responding.");
        }

        // Custom content
        if (this.hasContent(children)) {
            sections.push("\n\n");
            sections.push(children);
        }

        return wrapWithDelimiter(sections, "format", delimiter);
    }

    private getPreferredFormat(type: string | undefined, provider: string): string {
        if (type) {
            return type;
        }
        // Auto-select based on provider preference
        const adaptations = PROVIDER_ADAPTATIONS[provider as keyof typeof PROVIDER_ADAPTATIONS];
        return adaptations?.formatPreference ?? "text";
    }
}
