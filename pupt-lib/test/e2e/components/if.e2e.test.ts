import { describe, it, expect } from 'vitest';
import { createPromptFromSource } from '../../../src/create-prompt';
import { render } from '../../../src/render';
import { jsx, jsxs, Fragment } from '../../../src/jsx-runtime';
import { If } from '../../../components/control/If';
import type { LlmProvider } from '../../../src/types/context';

describe('If provider e2e', () => {
  it('should render <If provider="..."> conditionally through .prompt pipeline', async () => {
    const source = `
<Prompt name="provider-switch" bare>
  <If provider="anthropic">
    <Format delimiter="xml" />
  </If>
  <If provider="openai">
    <Format delimiter="markdown" />
  </If>
  <Task>Explain generics</Task>
</Prompt>
`;
    // Render for anthropic
    const element1 = await createPromptFromSource(source, 'provider-switch.prompt');
    const result1 = await render(element1, { env: { llm: { provider: 'anthropic' } } });
    expect(result1.ok).toBe(true);
    expect(result1.text).toContain('xml');
    expect(result1.text).not.toContain('markdown');

    // Render for openai
    const element2 = await createPromptFromSource(source, 'provider-switch.prompt');
    const result2 = await render(element2, { env: { llm: { provider: 'openai' } } });
    expect(result2.ok).toBe(true);
    expect(result2.text).toContain('markdown');
  });

  it('should render <If notProvider="..."> through .prompt pipeline', async () => {
    const source = `
<Prompt name="not-provider-test" bare>
  <If notProvider="openai">Content for non-OpenAI providers</If>
  <Task>Do something</Task>
</Prompt>
`;
    const element1 = await createPromptFromSource(source, 'not-provider.prompt');
    const result1 = await render(element1, { env: { llm: { provider: 'anthropic' } } });
    expect(result1.ok).toBe(true);
    expect(result1.text).toContain('non-OpenAI');

    const element2 = await createPromptFromSource(source, 'not-provider.prompt');
    const result2 = await render(element2, { env: { llm: { provider: 'openai' } } });
    expect(result2.ok).toBe(true);
    expect(result2.text).not.toContain('non-OpenAI');
  });

  it('should render <If provider={array}> through .prompt pipeline', async () => {
    const source = `
<Prompt name="multi-provider" bare>
  <If provider={['anthropic', 'google']}>Multi-provider content</If>
  <Task>Do something</Task>
</Prompt>
`;
    const element1 = await createPromptFromSource(source, 'multi-provider.prompt');
    const result1 = await render(element1, { env: { llm: { provider: 'google' } } });
    expect(result1.ok).toBe(true);
    expect(result1.text).toContain('Multi-provider content');

    const element2 = await createPromptFromSource(source, 'multi-provider.prompt');
    const result2 = await render(element2, { env: { llm: { provider: 'openai' } } });
    expect(result2.ok).toBe(true);
    expect(result2.text).not.toContain('Multi-provider content');
  });

  describe('snapshots', () => {
    const providers: LlmProvider[] = ['anthropic', 'openai', 'google'];

    for (const provider of providers) {
      it(`should match snapshot: provider conditional for ${provider}`, async () => {
        const element = jsxs(Fragment, {
          children: [
            jsx(If, { provider: 'anthropic', children: 'Anthropic-specific instructions' }),
            jsx(If, { provider: 'openai', children: 'OpenAI-specific instructions' }),
            jsx(If, { provider: 'google', children: 'Google-specific instructions' }),
          ],
        });
        const result = await render(element, { env: { llm: { provider } } });
        expect(result.text).toMatchSnapshot();
      });
    }

    it('should match snapshot: notProvider conditional', async () => {
      const element = jsx(If, {
        notProvider: 'openai',
        children: 'Non-OpenAI content',
      });
      const result = await render(element, { env: { llm: { provider: 'anthropic' } } });
      expect(result.text).toMatchSnapshot();
    });
  });
});
