import { describe, it, expect } from 'vitest';
import { PROVIDER_ADAPTATIONS, LANGUAGE_CONVENTIONS } from '../../../components/presets/provider-adaptations';
import { LLM_PROVIDERS } from '../../../src/types/context';
import type { LlmProvider } from '../../../src/types/context';

describe('PROVIDER_ADAPTATIONS', () => {
  it('should have an entry for every LLM_PROVIDERS value', () => {
    for (const provider of LLM_PROVIDERS) {
      expect(PROVIDER_ADAPTATIONS[provider]).toBeDefined();
    }
  });

  it('should specify rolePrefix, constraintStyle, formatPreference, instructionStyle', () => {
    const anthropic = PROVIDER_ADAPTATIONS['anthropic'];
    expect(anthropic.rolePrefix).toBe('You are ');
    expect(anthropic.constraintStyle).toBe('positive');
    expect(anthropic.formatPreference).toBe('xml');
    expect(anthropic.instructionStyle).toBe('structured');
  });

  it('should use positive constraint style for anthropic and google', () => {
    expect(PROVIDER_ADAPTATIONS['anthropic'].constraintStyle).toBe('positive');
    expect(PROVIDER_ADAPTATIONS['google'].constraintStyle).toBe('positive');
  });

  it('should have correct openai adaptations', () => {
    const openai = PROVIDER_ADAPTATIONS['openai'];
    expect(openai.rolePrefix).toBe('You are ');
    expect(openai.constraintStyle).toBe('balanced');
    expect(openai.formatPreference).toBe('markdown');
    expect(openai.instructionStyle).toBe('direct');
  });

  it('should have correct google adaptations', () => {
    const google = PROVIDER_ADAPTATIONS['google'];
    expect(google.rolePrefix).toBe('Your role: ');
    expect(google.constraintStyle).toBe('positive');
    expect(google.formatPreference).toBe('markdown');
    expect(google.instructionStyle).toBe('direct');
  });

  it('should have safe defaults for unspecified provider', () => {
    const unspecified = PROVIDER_ADAPTATIONS['unspecified'];
    expect(unspecified.rolePrefix).toBe('You are ');
    expect(unspecified.constraintStyle).toBe('positive');
    expect(unspecified.formatPreference).toBe('markdown');
    expect(unspecified.instructionStyle).toBe('structured');
  });

  it('should have balanced constraint style for non-primary providers', () => {
    const balancedProviders: LlmProvider[] = ['openai', 'meta', 'mistral', 'xai', 'cohere'];
    for (const provider of balancedProviders) {
      expect(PROVIDER_ADAPTATIONS[provider].constraintStyle).toBe('balanced');
    }
  });

  it('should have valid types for all provider adaptation fields', () => {
    for (const provider of LLM_PROVIDERS) {
      const adaptation = PROVIDER_ADAPTATIONS[provider];
      expect(typeof adaptation.rolePrefix).toBe('string');
      expect(['positive', 'negative', 'balanced']).toContain(adaptation.constraintStyle);
      expect(['xml', 'markdown', 'json']).toContain(adaptation.formatPreference);
      expect(['direct', 'elaborate', 'structured']).toContain(adaptation.instructionStyle);
    }
  });
});

describe('LANGUAGE_CONVENTIONS', () => {
  it('should have conventions for typescript, python, rust, go', () => {
    expect(LANGUAGE_CONVENTIONS['typescript']).toBeDefined();
    expect(LANGUAGE_CONVENTIONS['python']).toBeDefined();
    expect(LANGUAGE_CONVENTIONS['rust']).toBeDefined();
    expect(LANGUAGE_CONVENTIONS['go']).toBeDefined();
  });

  it('should have an unspecified fallback', () => {
    expect(LANGUAGE_CONVENTIONS['unspecified']).toBeDefined();
  });

  it('should return arrays of strings for each language', () => {
    for (const conventions of Object.values(LANGUAGE_CONVENTIONS)) {
      expect(Array.isArray(conventions)).toBe(true);
      expect(conventions.length).toBeGreaterThan(0);
      for (const convention of conventions) {
        expect(typeof convention).toBe('string');
      }
    }
  });

  it('should have TypeScript-specific conventions', () => {
    const ts = LANGUAGE_CONVENTIONS['typescript'];
    expect(ts.some(c => c.toLowerCase().includes('type'))).toBe(true);
  });

  it('should have Python-specific conventions', () => {
    const py = LANGUAGE_CONVENTIONS['python'];
    expect(py.some(c => c.toLowerCase().includes('pep') || c.toLowerCase().includes('type hint'))).toBe(true);
  });
});
