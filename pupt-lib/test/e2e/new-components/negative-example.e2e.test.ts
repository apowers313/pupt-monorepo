import { describe, it, expect } from 'vitest';
import { createPromptFromSource } from '../../../src/create-prompt';
import { render } from '../../../src/render';
import { jsx } from '../../../src/jsx-runtime';
import { NegativeExample } from '../../../components/examples/NegativeExample';

describe('NegativeExample e2e', () => {
  it('should render through .prompt pipeline', async () => {
    const source = `
<Prompt name="neg-example" bare>
  <Task>Summarize articles.</Task>
  <NegativeExample reason="Too verbose">
    I think this is a really interesting article about...
  </NegativeExample>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'neg-example.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('<bad-example>');
    expect(result.text).toContain('Too verbose');
    expect(result.text).toContain('really interesting article');
  });

  it('should render without reason through pipeline', async () => {
    const source = `
<Prompt name="neg-no-reason" bare>
  <Task>Summarize articles.</Task>
  <NegativeExample>
    Bad response here
  </NegativeExample>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'neg-no-reason.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('<bad-example>');
    expect(result.text).toContain('Bad response here');
    expect(result.text).not.toContain('Reason');
  });

  describe('snapshots', () => {
    it('should match snapshot: negative example with reason', async () => {
      const element = jsx(NegativeExample, {
        reason: 'Includes personal opinions and is too long',
        children: 'I personally think this is a great article that covers many topics...',
      });
      const result = await render(element);
      expect(result.text).toMatchSnapshot();
    });

    it('should match snapshot: negative example without reason', async () => {
      const element = jsx(NegativeExample, {
        children: 'Error 404: Article not found',
      });
      const result = await render(element);
      expect(result.text).toMatchSnapshot();
    });
  });
});
