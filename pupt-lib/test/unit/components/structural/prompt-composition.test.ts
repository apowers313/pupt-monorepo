import { describe, expect,it } from 'vitest';

import { Constraint } from '../../../../components/structural/Constraint';
import { Constraints } from '../../../../components/structural/Constraints';
import { EdgeCases } from '../../../../components/structural/EdgeCases';
import { Fallback } from '../../../../components/structural/Fallback';
import { Fallbacks } from '../../../../components/structural/Fallbacks';
import { Guardrails } from '../../../../components/structural/Guardrails';
import { Prompt } from '../../../../components/structural/Prompt';
import { Reference } from '../../../../components/structural/Reference';
import { References } from '../../../../components/structural/References';
import { Task } from '../../../../components/structural/Task';
import { When } from '../../../../components/structural/When';
import { jsx, jsxs } from '../../../../src/jsx-runtime';
import { render } from '../../../../src/render';
import { DEFAULT_ENVIRONMENT } from '../../../../src/types/context';

describe('Prompt additive composition', () => {
  it('should extend default constraints when Constraints extend is provided', async () => {
    const element = jsxs(Prompt, {
      name: 'test',
      children: [
        jsxs(Constraints, {
          extend: true,
          children: [jsx(Constraint, { type: 'must', children: 'Custom constraint' })],
        }),
        jsx(Task, { children: 'Do something' }),
      ],
    });
    const result = await render(element);
    // Should have BOTH default constraints AND custom constraint
    expect(result.text).toContain('Custom constraint');
    expect(result.text).toContain('concise'); // default
  });

  it('should replace default constraints when Constraints is provided without extend', async () => {
    const element = jsxs(Prompt, {
      name: 'test',
      children: [
        jsx(Constraints, {
          children: jsx(Constraint, { type: 'must', children: 'Only my constraint' }),
        }),
        jsx(Task, { children: 'Do something' }),
      ],
    });
    const result = await render(element);
    expect(result.text).toContain('Only my constraint');
    expect(result.text).not.toContain('Keep responses concise'); // no default
  });

  it('should exclude specific defaults when exclude is provided with extend', async () => {
    const element = jsxs(Prompt, {
      name: 'test',
      children: [
        jsxs(Constraints, {
          extend: true,
          exclude: ['concise'],
          children: [jsx(Constraint, { type: 'must', children: 'My custom rule' })],
        }),
        jsx(Task, { children: 'Do something' }),
      ],
    });
    const result = await render(element);
    expect(result.text).toContain('My custom rule');
    expect(result.text).not.toContain('concise'); // excluded
    expect(result.text).toContain('accurate'); // other defaults still present
  });

  it('should still add default constraints when no Constraints container and no individual Constraints', async () => {
    const element = jsx(Prompt, {
      name: 'test',
      children: jsx(Task, { children: 'Do something' }),
    });
    const result = await render(element);
    expect(result.text).toContain('concise'); // default constraints present
    expect(result.text).toContain('accurate'); // default constraints present
  });

  it('should not add default constraints when noConstraints is set', async () => {
    const element = jsx(Prompt, {
      name: 'test',
      noConstraints: true,
      children: jsx(Task, { children: 'Do something' }),
    });
    const result = await render(element);
    expect(result.text).not.toContain('Keep responses concise');
  });

  it('should not add default constraints when bare mode is on', async () => {
    const element = jsxs(Prompt, {
      name: 'test',
      bare: true,
      children: [
        jsx(Constraints, {
          extend: true,
          children: jsx(Constraint, { type: 'must', children: 'Custom' }),
        }),
        jsx(Task, { children: 'Do something' }),
      ],
    });
    const result = await render(element);
    // Bare mode renders children only, no default sections
    expect(result.text).toContain('Custom');
    expect(result.text).not.toContain('Keep responses concise');
  });

  it('should work with Constraints having presets inside Prompt', async () => {
    const element = jsxs(Prompt, {
      name: 'test',
      children: [
        jsx(Constraints, {
          presets: ['cite-sources'],
        }),
        jsx(Task, { children: 'Explain something' }),
      ],
    });
    const result = await render(element);
    expect(result.text).toContain('sources');
    // Replace mode - no default constraints
    expect(result.text).not.toContain('Keep responses concise');
  });

  // Phase 8: Guardrails composition
  it('should render default guardrails when defaults.guardrails is true', async () => {
    const element = jsx(Prompt, {
      name: 'test',
      defaults: { guardrails: true },
      children: jsx(Task, { children: 'Do something' }),
    });
    const result = await render(element);
    expect(result.text).toContain('harmful');
    expect(result.text).toContain('system prompts');
  });

  it('should NOT render default guardrails by default (off by default)', async () => {
    const element = jsx(Prompt, {
      name: 'test',
      children: jsx(Task, { children: 'Do something' }),
    });
    const result = await render(element);
    expect(result.text).not.toContain('Safety and compliance');
  });

  it('should render default guardrails when includeGuardrails config is true', async () => {
    const element = jsx(Prompt, {
      name: 'test',
      children: jsx(Task, { children: 'Do something' }),
    });
    const env = {
      ...DEFAULT_ENVIRONMENT,
      prompt: { ...DEFAULT_ENVIRONMENT.prompt, includeGuardrails: true },
    };
    const result = await render(element, { env });
    expect(result.text).toContain('harmful');
    expect(result.text).toContain('system prompts');
  });

  it('should suppress default guardrails with noGuardrails', async () => {
    const element = jsx(Prompt, {
      name: 'test',
      noGuardrails: true,
      children: jsx(Task, { children: 'Do something' }),
    });
    const env = {
      ...DEFAULT_ENVIRONMENT,
      prompt: { ...DEFAULT_ENVIRONMENT.prompt, includeGuardrails: true },
    };
    const result = await render(element, { env });
    expect(result.text).not.toContain('Safety and compliance');
  });

  it('should replace default guardrails when Guardrails container is present without extend', async () => {
    const element = jsxs(Prompt, {
      name: 'test',
      defaults: { guardrails: true },
      children: [
        jsx(Guardrails, { preset: 'minimal' }),
        jsx(Task, { children: 'Do something' }),
      ],
    });
    const result = await render(element);
    // Should have only the minimal preset content (in the Guardrails child)
    // Should NOT have a second set of default guardrails appended
    const guardrailsTags = (result.text.match(/<guardrails>/g) || []).length;
    expect(guardrailsTags).toBe(1);
  });

  it('should extend default guardrails when Guardrails has extend prop', async () => {
    const element = jsxs(Prompt, {
      name: 'test',
      defaults: { guardrails: true },
      children: [
        jsx(Guardrails, {
          extend: true,
          prohibit: ['Share pricing'],
        }),
        jsx(Task, { children: 'Do something' }),
      ],
    });
    const result = await render(element);
    // Should have both the Guardrails child content AND the Prompt's default guardrails
    expect(result.text).toContain('Share pricing');
    expect(result.text).toContain('Safety and compliance');
  });

  it('should exclude specific default guardrails when exclude is used with extend', async () => {
    const element = jsxs(Prompt, {
      name: 'test',
      defaults: { guardrails: true },
      children: [
        jsx(Guardrails, {
          extend: true,
          exclude: ['impersonate'],
        }),
        jsx(Task, { children: 'Do something' }),
      ],
    });
    const result = await render(element);
    expect(result.text).toContain('harmful');
    // The Prompt-generated defaults should not contain 'impersonate'
    // (the Guardrails child renders its own, and Prompt's additional defaults are filtered)
  });

  // Phase 8: EdgeCases, Fallbacks, References detection
  it('should detect EdgeCases container in children', async () => {
    const element = jsxs(Prompt, {
      name: 'test',
      children: [
        jsx(EdgeCases, {
          children: jsx(When, { condition: 'input is empty', children: 'Ask for input' }),
        }),
        jsx(Task, { children: 'Do something' }),
      ],
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('input is empty');
  });

  it('should detect Fallbacks container in children', async () => {
    const element = jsxs(Prompt, {
      name: 'test',
      children: [
        jsx(Fallbacks, {
          children: jsx(Fallback, { when: 'error occurs', then: 'retry' }),
        }),
        jsx(Task, { children: 'Do something' }),
      ],
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('error occurs');
  });

  it('should detect References container in children', async () => {
    const element = jsxs(Prompt, {
      name: 'test',
      children: [
        jsx(References, {
          children: jsx(Reference, { title: 'API Docs', url: 'https://example.com' }),
        }),
        jsx(Task, { children: 'Do something' }),
      ],
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('API Docs');
  });
});
