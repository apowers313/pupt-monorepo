import {
    Component,
    type ComponentType,
    findChildrenOfType,
    PROPS,
    type PuptNode,
    type RenderContext,
    wrapWithDelimiter,
} from "@pupt/lib";
import { z } from "zod";

import { DEFAULT_CONSTRAINTS, PROVIDER_ADAPTATIONS, ROLE_PRESETS, STANDARD_GUARDRAILS } from "../presets";
import { ChainOfThought } from "../reasoning/ChainOfThought";
import { Constraint } from "./Constraint";
import { Constraints } from "./Constraints";
import { EdgeCases } from "./EdgeCases";
import { Fallbacks } from "./Fallbacks";
import { Format } from "./Format";
import { Guardrails } from "./Guardrails";
import { References } from "./References";
import { Role } from "./Role";
import { SuccessCriteria } from "./SuccessCriteria";
import { Task } from "./Task";

const promptDefaultsObjectSchema = z.object({
    role: z.boolean().optional(),
    format: z.boolean().optional(),
    constraints: z.boolean().optional(),
    successCriteria: z.boolean().optional(),
    guardrails: z.boolean().optional(),
});

const promptDefaultsSchema = z.union([promptDefaultsObjectSchema, z.literal("none")]).optional();

export const promptSchema = z
    .object({
        name: z.string(),
        title: z.string().optional(),
        version: z.string().optional(),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
        bare: z.boolean().optional(),
        defaults: promptDefaultsSchema,
        noRole: z.boolean().optional(),
        noFormat: z.boolean().optional(),
        noConstraints: z.boolean().optional(),
        noSuccessCriteria: z.boolean().optional(),
        noGuardrails: z.boolean().optional(),
        role: z.string().optional(),
        expertise: z.string().optional(),
        format: z.string().optional(),
        audience: z.string().optional(),
        tone: z.string().optional(),
        slots: z.record(z.string(), z.unknown()).optional(),
    })
    .loose();

type PromptSlots = {
    role?: ComponentType;
    format?: ComponentType;
    constraints?: ComponentType;
    successCriteria?: ComponentType;
    guardrails?: ComponentType;
};

type PromptProps = z.infer<typeof promptSchema> & { children: PuptNode; slots?: PromptSlots };

export class Prompt extends Component<PromptProps> {
    static schema = promptSchema;

    render(props: PromptProps, _resolvedValue: undefined, context: RenderContext): PuptNode {
        const {
            bare = false,
            defaults,
            noRole,
            noFormat,
            noConstraints,
            noSuccessCriteria,
            noGuardrails,
            role,
            expertise,
            slots,
            children,
        } = props;

        // If bare or defaults="none", just render children (no auto-generated sections)
        if (bare || defaults === "none") {
            return children;
        }

        // Resolve the defaults object, merging shorthand no* props
        // Shorthand props (noRole, etc.) map to defaults: { role: false, ... }
        const resolvedDefaults = typeof defaults === "object" ? { ...defaults } : {};
        if (noRole) {
            resolvedDefaults.role = false;
        }
        if (noFormat) {
            resolvedDefaults.format = false;
        }
        if (noConstraints) {
            resolvedDefaults.constraints = false;
        }
        if (noSuccessCriteria) {
            resolvedDefaults.successCriteria = false;
        }
        if (noGuardrails) {
            resolvedDefaults.guardrails = false;
        }

        const promptConfig = context.env.prompt;

        // Detect which section types children already provide
        const childArray = Array.isArray(children) ? children : [children];
        const hasRole = findChildrenOfType(childArray, Role).length > 0;
        const hasTask = findChildrenOfType(childArray, Task).length > 0;
        const hasConstraint = findChildrenOfType(childArray, Constraint).length > 0;
        const hasFormat = findChildrenOfType(childArray, Format).length > 0;
        const hasSuccessCriteria = findChildrenOfType(childArray, SuccessCriteria).length > 0;

        // Validation: warn if no Task child is provided
        if (!hasTask) {
            context.errors.push({
                component: "Prompt",
                prop: null,
                message: "Prompt has no Task child. Consider adding a <Task> element to define the objective.",
                code: "warn_missing_task",
                path: [],
            });
        }

        // Detect container components for composition
        const constraintsContainers = findChildrenOfType(childArray, Constraints);
        const hasConstraintsContainer = constraintsContainers.length > 0;

        // Detect Phase 8 container components
        const guardrailsContainers = findChildrenOfType(childArray, Guardrails);
        const hasGuardrailsContainer = guardrailsContainers.length > 0;
        const hasEdgeCases = findChildrenOfType(childArray, EdgeCases).length > 0;
        const hasFallbacks = findChildrenOfType(childArray, Fallbacks).length > 0;
        const hasReferences = findChildrenOfType(childArray, References).length > 0;

        // Detect conflicting Format strict + ChainOfThought showReasoning
        if (hasFormat) {
            const formatElements = findChildrenOfType(childArray, Format);
            const cotElements = findChildrenOfType(childArray, ChainOfThought);
            if (cotElements.length > 0) {
                const formatIsStrict = formatElements.some((el) => el[PROPS].strict === true);
                const cotShowsReasoning = cotElements.some((el) => el[PROPS].showReasoning !== false);
                if (formatIsStrict && cotShowsReasoning) {
                    context.errors.push({
                        component: "Prompt",
                        prop: null,
                        message:
                            "<Format strict> and <ChainOfThought showReasoning> produce contradictory instructions. Format strict tells the LLM to return ONLY formatted output, while ChainOfThought asks it to show reasoning. Consider setting showReasoning={false} or removing strict.",
                        code: "warn_conflicting_instructions",
                        path: [],
                    });
                }
            }
        }

        const sections: PuptNode[] = [];

        // 1. Role section (first, per research)
        const includeRole = this.shouldIncludeSection(resolvedDefaults.role, promptConfig.includeRole);
        if (includeRole && !hasRole) {
            if (slots?.role) {
                sections.push(this.renderSlotComponent(slots.role, context));
            } else {
                sections.push(this.renderDefaultRole(role, expertise, context));
            }
        }

        // 2. User content (Task, Context, etc.)
        sections.push(children);

        // 3. Format section
        const includeFormat = this.shouldIncludeSection(resolvedDefaults.format, promptConfig.includeFormat);
        if (includeFormat && !hasFormat) {
            if (slots?.format) {
                sections.push(this.renderSlotComponent(slots.format, context));
            } else {
                sections.push(this.renderDefaultFormat(context));
            }
        }

        // 4. Constraints section - handle container composition
        const includeConstraints = this.shouldIncludeSection(
            resolvedDefaults.constraints,
            promptConfig.includeConstraints,
        );
        if (hasConstraintsContainer) {
            // Container found - check extend/exclude props
            const container = constraintsContainers[0];
            const containerProps = container[PROPS];
            const isExtend = containerProps.extend === true;
            const excludeList = (containerProps.exclude as string[] | undefined) ?? [];

            if (isExtend && includeConstraints) {
                // Extend mode: add defaults (filtered by exclude) BEFORE the container
                if (slots?.constraints) {
                    sections.push(this.renderSlotComponent(slots.constraints, context));
                } else {
                    sections.push(this.renderDefaultConstraints(context, excludeList));
                }
            }
            // If not extend, the container replaces defaults entirely (already in children)
        } else if (includeConstraints && !hasConstraint) {
            // No container and no individual constraints - add defaults (or slot)
            if (slots?.constraints) {
                sections.push(this.renderSlotComponent(slots.constraints, context));
            } else {
                sections.push(this.renderDefaultConstraints(context));
            }
        }

        // 5. Success criteria (off by default)
        const includeSuccessCriteria = this.shouldIncludeSection(
            resolvedDefaults.successCriteria,
            promptConfig.includeSuccessCriteria,
        );
        if (includeSuccessCriteria && !hasSuccessCriteria) {
            if (slots?.successCriteria) {
                sections.push(this.renderSlotComponent(slots.successCriteria, context));
            } else {
                sections.push(this.renderDefaultSuccessCriteria(context));
            }
        }

        // 6. Guardrails (off by default) - handle container composition
        const includeGuardrails = this.shouldIncludeSection(
            resolvedDefaults.guardrails,
            promptConfig.includeGuardrails,
        );
        if (hasGuardrailsContainer) {
            const container = guardrailsContainers[0];
            const containerProps = container[PROPS];
            const isExtend = containerProps.extend === true;
            const excludeList = (containerProps.exclude as string[] | undefined) ?? [];

            if (isExtend && includeGuardrails) {
                if (slots?.guardrails) {
                    sections.push(this.renderSlotComponent(slots.guardrails, context));
                } else {
                    sections.push(this.renderDefaultGuardrails(context, excludeList));
                }
            }
        } else if (includeGuardrails) {
            if (slots?.guardrails) {
                sections.push(this.renderSlotComponent(slots.guardrails, context));
            } else {
                sections.push(this.renderDefaultGuardrails(context));
            }
        }

        // 7-9. EdgeCases, Fallbacks, References detection
        // These containers are detected so Prompt is aware of them.
        // Currently no defaults are auto-injected (they're user-specified).
        // The detection enables future extend/exclude composition.
        void hasEdgeCases;
        void hasFallbacks;
        void hasReferences;

        return sections;
    }

    private renderSlotComponent(SlotComponent: ComponentType, context: RenderContext): PuptNode {
        const instance = new (SlotComponent as new () => Component)();
        if (typeof instance.render === "function") {
            const result = instance.render({}, undefined as never, context);
            // Slot components are expected to return synchronously
            return result as PuptNode;
        }
        return "";
    }

    private shouldIncludeSection(defaultsValue: boolean | undefined, configValue: boolean): boolean {
        // Explicit defaults override takes precedence
        if (defaultsValue !== undefined) {
            return defaultsValue;
        }
        return configValue;
    }

    private renderDefaultRole(
        role: string | undefined,
        expertise: string | undefined,
        context: RenderContext,
    ): PuptNode {
        const presetKey = role ?? context.env.prompt.defaultRole;
        const preset = ROLE_PRESETS[presetKey];
        const provider = this.getProvider(context);
        const adaptations = PROVIDER_ADAPTATIONS[provider];
        const delimiter = this.getDelimiter(context);

        const title = preset ? preset.title : presetKey;
        const prefix = adaptations.rolePrefix;

        const parts: string[] = [];
        parts.push(`${prefix}a helpful ${title}.`);

        if (expertise) {
            parts.push(`You have expertise in ${expertise}.`);
        } else if (preset && preset.expertise.length > 0) {
            parts.push(`You have expertise in ${preset.expertise.join(", ")}.`);
        }

        return wrapWithDelimiter(parts.join(" "), "role", delimiter);
    }

    private renderDefaultFormat(context: RenderContext): PuptNode {
        const delimiter = this.getDelimiter(context);
        const provider = this.getProvider(context);
        const adaptations = PROVIDER_ADAPTATIONS[provider];
        const formatPref = adaptations.formatPreference;
        return wrapWithDelimiter(`Output format: ${formatPref}`, "format", delimiter);
    }

    private renderDefaultConstraints(context: RenderContext, exclude: string[] = []): PuptNode {
        const delimiter = this.getDelimiter(context);
        let constraints = DEFAULT_CONSTRAINTS;
        if (exclude.length > 0) {
            constraints = constraints.filter(
                (text) => !exclude.some((ex) => text.toLowerCase().includes(ex.toLowerCase())),
            );
        }
        const constraintLines = constraints.map((text) => `- ${text}`).join("\n");
        return wrapWithDelimiter(constraintLines, "constraints", delimiter);
    }

    private renderDefaultSuccessCriteria(context: RenderContext): PuptNode {
        const delimiter = this.getDelimiter(context);
        return wrapWithDelimiter(
            "- Response addresses the task completely\n- Output is clear and well-structured",
            "success-criteria",
            delimiter,
        );
    }

    private renderDefaultGuardrails(context: RenderContext, exclude: string[] = []): PuptNode {
        const delimiter = this.getDelimiter(context);
        let guardrails = STANDARD_GUARDRAILS.standard;
        if (exclude.length > 0) {
            guardrails = guardrails.filter(
                (text) => !exclude.some((ex) => text.toLowerCase().includes(ex.toLowerCase())),
            );
        }
        const lines = ["Safety and compliance requirements:"];
        for (const g of guardrails) {
            lines.push(`- ${g}`);
        }
        return wrapWithDelimiter(lines.join("\n"), "guardrails", delimiter);
    }
}
