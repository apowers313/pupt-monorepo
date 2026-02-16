import { describe, expect,it } from 'vitest';

import { Constraint } from '../../../../components/structural/Constraint';
import { jsx } from '../../../../src/jsx-runtime';
import { render } from '../../../../src/render';

describe('Constraint positive framing', () => {
  it('should use positive framing for anthropic provider', async () => {
    const element = jsx(Constraint, {
      type: 'must-not',
      positive: 'Remain objective and factual',
      children: 'Include personal opinions',
    });
    const result = await render(element, { env: { llm: { provider: 'anthropic' } } });
    expect(result.text).toContain('Remain objective');
    expect(result.text).not.toContain('personal opinions');
  });

  it('should use negative framing for openai provider', async () => {
    const element = jsx(Constraint, {
      type: 'must-not',
      positive: 'Remain objective and factual',
      children: 'Include personal opinions',
    });
    const result = await render(element, { env: { llm: { provider: 'openai' } } });
    expect(result.text).toContain('MUST NOT');
    expect(result.text).toContain('personal opinions');
  });

  it('should use positive framing for google provider', async () => {
    const element = jsx(Constraint, {
      type: 'must-not',
      positive: 'Remain objective and factual',
      children: 'Include personal opinions',
    });
    const result = await render(element, { env: { llm: { provider: 'google' } } });
    expect(result.text).toContain('Remain objective');
    expect(result.text).not.toContain('personal opinions');
  });

  it('should fall back to negative framing when no positive alternative', async () => {
    const element = jsx(Constraint, {
      type: 'must-not',
      children: 'Use profanity',
    });
    const result = await render(element, { env: { llm: { provider: 'anthropic' } } });
    expect(result.text).toContain('MUST NOT');
    expect(result.text).toContain('Use profanity');
  });
});

describe('Constraint presets', () => {
  it('should render be-concise preset', async () => {
    const element = jsx(Constraint, { preset: 'be-concise' });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('concise');
  });

  it('should render cite-sources preset', async () => {
    const element = jsx(Constraint, { preset: 'cite-sources' });
    const result = await render(element);
    expect(result.text).toContain('Cite sources');
    expect(result.text).toContain('MUST');
  });

  it('should render acknowledge-uncertainty preset', async () => {
    const element = jsx(Constraint, { preset: 'acknowledge-uncertainty' });
    const result = await render(element);
    expect(result.text).toContain('uncertain');
  });

  it('should render no-opinions preset with positive framing for anthropic', async () => {
    const element = jsx(Constraint, { preset: 'no-opinions' });
    const result = await render(element, { env: { llm: { provider: 'anthropic' } } });
    expect(result.text).toContain('Remain objective');
  });

  it('should render no-opinions preset with negative framing for openai', async () => {
    const element = jsx(Constraint, { preset: 'no-opinions' });
    const result = await render(element, { env: { llm: { provider: 'openai' } } });
    expect(result.text).toContain('MUST NOT');
    expect(result.text).toContain('personal opinions');
  });

  it('should allow type override on preset', async () => {
    const element = jsx(Constraint, { preset: 'be-concise', type: 'must' });
    const result = await render(element);
    expect(result.text).toContain('MUST');
    expect(result.text).toContain('concise');
  });
});

describe('Constraint category', () => {
  it('should accept category prop', async () => {
    const element = jsx(Constraint, {
      type: 'must',
      category: 'accuracy',
      children: 'Be accurate',
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('Be accurate');
  });
});
