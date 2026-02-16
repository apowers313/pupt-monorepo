import '../../../../components';

import { describe, expect,it } from 'vitest';

import { If } from '../../../../components/control/If';
import { jsx } from '../../../../src/jsx-runtime';
import { render } from '../../../../src/render';

describe('If environment conditions', () => {
  it('should render children when provider matches', async () => {
    const element = jsx(If, {
      provider: 'anthropic',
      children: 'Claude-specific content',
    });
    const result = await render(element, { env: { llm: { provider: 'anthropic' } } });
    expect(result.text).toContain('Claude-specific content');
  });

  it('should NOT render children when provider does not match', async () => {
    const element = jsx(If, {
      provider: 'anthropic',
      children: 'Claude-specific content',
    });
    const result = await render(element, { env: { llm: { provider: 'openai' } } });
    expect(result.text).not.toContain('Claude-specific content');
  });

  it('should support array of providers', async () => {
    const element = jsx(If, {
      provider: ['anthropic', 'google'],
      children: 'Positive-framing providers',
    });
    const result = await render(element, { env: { llm: { provider: 'google' } } });
    expect(result.text).toContain('Positive-framing providers');
  });

  it('should NOT render when provider is not in array', async () => {
    const element = jsx(If, {
      provider: ['anthropic', 'google'],
      children: 'Positive-framing providers',
    });
    const result = await render(element, { env: { llm: { provider: 'openai' } } });
    expect(result.text).not.toContain('Positive-framing providers');
  });

  it('should support negated provider with notProvider prop', async () => {
    const element = jsx(If, {
      notProvider: 'openai',
      children: 'Content for non-OpenAI providers',
    });
    const result = await render(element, { env: { llm: { provider: 'anthropic' } } });
    expect(result.text).toContain('Content for non-OpenAI');
  });

  it('should NOT render when notProvider matches current provider', async () => {
    const element = jsx(If, {
      notProvider: 'openai',
      children: 'Content for non-OpenAI providers',
    });
    const result = await render(element, { env: { llm: { provider: 'openai' } } });
    expect(result.text).not.toContain('Content for non-OpenAI');
  });

  it('should support notProvider as an array', async () => {
    const element = jsx(If, {
      notProvider: ['openai', 'google'],
      children: 'Not OpenAI or Google',
    });
    const result = await render(element, { env: { llm: { provider: 'anthropic' } } });
    expect(result.text).toContain('Not OpenAI or Google');
  });

  it('should NOT render when notProvider array includes current provider', async () => {
    const element = jsx(If, {
      notProvider: ['openai', 'google'],
      children: 'Not OpenAI or Google',
    });
    const result = await render(element, { env: { llm: { provider: 'openai' } } });
    expect(result.text).not.toContain('Not OpenAI or Google');
  });

  it('should handle provider with no env provided (defaults to unspecified)', async () => {
    const element = jsx(If, {
      provider: 'anthropic',
      children: 'Claude-specific content',
    });
    const result = await render(element);
    expect(result.text).not.toContain('Claude-specific content');
  });

  it('should handle unspecified provider matching', async () => {
    const element = jsx(If, {
      provider: 'unspecified',
      children: 'Default content',
    });
    const result = await render(element);
    expect(result.text).toContain('Default content');
  });

  it('should use provider prop when both provider and when are specified', async () => {
    // provider prop takes precedence when specified
    const element = jsx(If, {
      provider: 'anthropic',
      when: false,
      children: 'Should use provider logic',
    });
    const result = await render(element, { env: { llm: { provider: 'anthropic' } } });
    expect(result.text).toContain('Should use provider logic');
  });

  it('should render empty when provider does not match and when is true', async () => {
    const element = jsx(If, {
      provider: 'openai',
      when: true,
      children: 'Should check provider first',
    });
    const result = await render(element, { env: { llm: { provider: 'anthropic' } } });
    expect(result.text).not.toContain('Should check provider first');
  });
});
