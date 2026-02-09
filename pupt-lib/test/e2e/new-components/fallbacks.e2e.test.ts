import { describe, it, expect } from 'vitest';
import { createPromptFromSource } from '../../../src/create-prompt';
import { render } from '../../../src/render';
import { jsx, jsxs } from '../../../src/jsx-runtime';
import { Fallbacks } from '../../../components/structural/Fallbacks';
import { Fallback } from '../../../components/structural/Fallback';

describe('Fallbacks e2e', () => {
  it('should render Fallback when/then through .prompt pipeline', async () => {
    const source = `
<Prompt name="fallbacks-test" bare>
  <Task>Help me write code.</Task>
  <Fallbacks>
    <Fallback when="unable to complete" then="explain why" />
    <Fallback when="missing info" then="ask questions" />
  </Fallbacks>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'fallbacks.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('unable to complete');
    expect(result.text).toContain('explain why');
    expect(result.text).toContain('missing info');
    expect(result.text).toContain('ask questions');
  });

  it('should render preset through .prompt pipeline', async () => {
    const source = `
<Prompt name="fallbacks-preset" bare>
  <Task>Help me write code.</Task>
  <Fallbacks preset="standard" />
</Prompt>
`;
    const element = await createPromptFromSource(source, 'fallbacks-preset.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('unable to complete the request');
  });

  describe('snapshots', () => {
    it('should match snapshot: fallbacks with children', async () => {
      const element = jsxs(Fallbacks, {
        children: [
          jsx(Fallback, { when: 'unable to complete', then: 'explain why' }),
          jsx(Fallback, { when: 'missing info', then: 'ask questions' }),
        ],
      });
      const result = await render(element);
      expect(result.text).toMatchSnapshot();
    });
  });
});
