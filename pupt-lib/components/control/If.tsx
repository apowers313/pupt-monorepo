import { z } from 'zod';
import { Component, evaluateFormula, LLM_PROVIDERS } from 'pupt-lib';
import type { PuptNode, RenderContext, LlmProvider } from 'pupt-lib';

const providerEnum = z.enum(LLM_PROVIDERS);
const providerOrArray = z.union([providerEnum, z.array(providerEnum)]);

export const ifSchema = z.object({
  when: z.union([z.boolean(), z.string()]).optional(),
  provider: providerOrArray.optional(),
  notProvider: providerOrArray.optional(),
}).passthrough();

export type IfProps = z.infer<typeof ifSchema> & { children?: PuptNode };

export class If extends Component<IfProps> {
  static schema = ifSchema;

  render({ when, provider, notProvider, children }: IfProps, _resolvedValue: void, context: RenderContext): PuptNode {
    let condition: boolean;

    if (provider !== undefined) {
      // Provider matching takes precedence
      const currentProvider: LlmProvider = context.env.llm.provider;
      const providers = Array.isArray(provider) ? provider : [provider];
      condition = providers.includes(currentProvider);
    } else if (notProvider !== undefined) {
      // Negated provider matching
      const currentProvider: LlmProvider = context.env.llm.provider;
      const excluded = Array.isArray(notProvider) ? notProvider : [notProvider];
      condition = !excluded.includes(currentProvider);
    } else if (typeof when === 'boolean') {
      condition = when;
    } else if (typeof when === 'string') {
      // Evaluate Excel formula
      condition = evaluateFormula(when, context.inputs);
    } else {
      condition = Boolean(when);
    }

    if (condition) {
      return children ?? null;
    }

    return null;
  }
}
