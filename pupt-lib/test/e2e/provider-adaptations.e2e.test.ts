import { describe, it, expect } from 'vitest';
import { render } from '../../src/render';
import { jsx } from '../../src/jsx-runtime';
import { Role } from '../../components/structural/Role';
import { Task } from '../../components/structural/Task';
import { Constraint } from '../../components/structural/Constraint';
import { Prompt } from '../../components/structural/Prompt';
import { PROVIDER_ADAPTATIONS, LANGUAGE_CONVENTIONS } from '../../components/presets/provider-adaptations';
import { LLM_PROVIDERS } from '../../src/types/context';
import type { LlmProvider } from '../../src/types/context';

describe('Provider adaptations e2e', () => {
  it('should have adaptation entries for all providers', () => {
    for (const provider of LLM_PROVIDERS) {
      const adaptation = PROVIDER_ADAPTATIONS[provider];
      expect(adaptation).toBeDefined();
      expect(adaptation.rolePrefix).toBeTruthy();
      expect(adaptation.constraintStyle).toBeTruthy();
      expect(adaptation.formatPreference).toBeTruthy();
      expect(adaptation.instructionStyle).toBeTruthy();
    }
  });

  it('should have language conventions for common languages', () => {
    const expectedLanguages = ['typescript', 'python', 'rust', 'go', 'unspecified'];
    for (const lang of expectedLanguages) {
      expect(LANGUAGE_CONVENTIONS[lang]).toBeDefined();
      expect(LANGUAGE_CONVENTIONS[lang].length).toBeGreaterThan(0);
    }
  });

  it('should render a prompt with Role + Task for each provider (baseline)', async () => {
    // This establishes baseline snapshots. When components start using
    // PROVIDER_ADAPTATIONS (Phase 5), these snapshots will change.
    const providers: LlmProvider[] = ['anthropic', 'openai', 'google'];

    for (const provider of providers) {
      const element = jsx(Prompt, {
        name: 'provider-test',
        bare: true,
        children: [
          jsx(Role, { children: 'You are a helpful software engineer.' }),
          jsx(Task, { children: 'Review this code.' }),
          jsx(Constraint, { type: 'must', children: 'Be thorough.' }),
        ],
      });

      const result = await render(element, {
        env: { llm: { provider } },
      });
      expect(result.ok).toBe(true);
      expect(result.text).toMatchSnapshot();
    }
  });

  it('should differentiate anthropic and google role prefix in adaptations table', () => {
    expect(PROVIDER_ADAPTATIONS['anthropic'].rolePrefix).toBe('You are ');
    expect(PROVIDER_ADAPTATIONS['google'].rolePrefix).toBe('Your role: ');
  });

  it('should differentiate anthropic and openai format preferences', () => {
    expect(PROVIDER_ADAPTATIONS['anthropic'].formatPreference).toBe('xml');
    expect(PROVIDER_ADAPTATIONS['openai'].formatPreference).toBe('markdown');
  });
});
