import {
    CHILDREN,
    Component,
    isElementOfType,
    isPuptElement,
    PROPS,
    type PuptElement,
    type PuptNode,
    type RenderContext,
    TYPE,
} from "@pupt/lib";
import { Fragment } from "@pupt/lib/jsx-runtime";
import { z } from "zod";

import { STEPS_PRESETS } from "../presets";
import { Step } from "./Step";

export const stepsSchema = z
    .object({
        preset: z.string().optional(),
        style: z.enum(["step-by-step", "think-aloud", "structured", "minimal", "least-to-most"]).optional(),
        showReasoning: z.boolean().optional(),
        verify: z.boolean().optional(),
        selfCritique: z.boolean().optional(),
        extend: z.boolean().optional(),
        numbered: z.boolean().optional(),
        delimiter: z.enum(["xml", "markdown", "none"]).optional(),
    })
    .loose();

type StepsProps = z.infer<typeof stepsSchema> & { children?: PuptNode };

export class Steps extends Component<StepsProps> {
    static schema = stepsSchema;

    render(props: StepsProps, _resolvedValue: undefined, _context: RenderContext): PuptNode {
        const { preset, style, showReasoning, verify, selfCritique, children } = props;
        const config = preset ? STEPS_PRESETS[preset] : undefined;

        const sections: PuptNode[] = [];

        // Style instruction
        const reasoningStyle = style ?? config?.style ?? "step-by-step";
        sections.push(this.getStyleInstruction(reasoningStyle));

        // Build steps content
        sections.push("\n\n<steps>\n");

        // Preset phases (if preset is provided and has phases)
        if (config?.phases) {
            let phaseNumber = 1;
            for (const phase of config.phases) {
                sections.push(`${phaseNumber}. ${phase}\n`);
                phaseNumber++;
            }

            // If children provided with extend, add them after preset steps
            if (this.hasContent(children)) {
                const flatChildren = this.flattenFragments(children);
                const autoNumbered = this.autoNumberSteps(flatChildren, phaseNumber);
                sections.push(autoNumbered);
            }
        } else if (this.hasContent(children)) {
            // No preset, just process children
            const flatChildren = this.flattenFragments(children);
            const autoNumbered = this.autoNumberSteps(flatChildren, 1);
            sections.push(autoNumbered);
        }

        sections.push("</steps>\n");

        // Verification step
        if (verify) {
            sections.push("\nVerify your answer is correct before finalizing.\n");
        }

        // Self-critique
        if (selfCritique) {
            sections.push("\nReview your response and identify any potential issues or improvements.\n");
        }

        // Show reasoning instruction
        if (showReasoning ?? config?.showReasoning) {
            sections.push("\nShow your reasoning process in the output.\n");
        }

        return sections;
    }

    private getStyleInstruction(style: string): string {
        const instructions: Record<string, string> = {
            "step-by-step": "Think through this step by step.",
            "think-aloud": "Reason through your thought process as you work.",
            structured: "Follow the structured approach below.",
            minimal: "Consider carefully before answering.",
            "least-to-most": "Start with the simplest version and build up.",
        };
        return instructions[style] ?? "Think through this step by step.";
    }

    private autoNumberSteps(flatChildren: PuptNode[], startNumber: number): PuptNode[] {
        let autoNumber = startNumber;
        return flatChildren.map((child) => {
            if (isPuptElement(child) && isElementOfType(child as PuptElement, Step)) {
                const stepProps = (child as PuptElement)[PROPS] as { number?: number; children: PuptNode };
                if (stepProps.number === undefined) {
                    return {
                        ...child,
                        [PROPS]: { ...stepProps, number: autoNumber++ },
                    };
                }
                autoNumber = (stepProps.number ?? 0) + 1;
            }
            return child;
        });
    }

    private flattenFragments(node: PuptNode): PuptNode[] {
        if (node === null || node === undefined || typeof node === "boolean") {
            return [];
        }

        if (typeof node === "string" || typeof node === "number") {
            return [node];
        }

        if (Array.isArray(node)) {
            const result: PuptNode[] = [];
            for (const child of node) {
                result.push(...this.flattenFragments(child));
            }
            return result;
        }

        if (isPuptElement(node)) {
            const element = node as PuptElement;
            // If it's a Fragment, flatten its children
            if (element[TYPE] === Fragment) {
                const fragmentChildren = element[CHILDREN];
                const result: PuptNode[] = [];
                for (const child of fragmentChildren) {
                    result.push(...this.flattenFragments(child));
                }
                return result;
            }
        }

        return [node];
    }
}
