import { describe, it, expect } from 'vitest';
import { createPromptFromSource } from '../../../src/create-prompt';
import { render } from '../../../src/render';
import { jsx, jsxs } from '../../../src/jsx-runtime';
import { EdgeCases } from '../../../components/structural/EdgeCases';
import { When } from '../../../components/structural/When';

describe('EdgeCases e2e', () => {
  it('should render When children through .prompt pipeline', async () => {
    const source = `
<Prompt name="edge-cases-test" bare>
  <Task>Help me write code.</Task>
  <EdgeCases>
    <When condition="input is empty">Ask for input</When>
    <When condition="data is ambiguous">Ask for clarification</When>
  </EdgeCases>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'edge-cases.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('input is empty');
    expect(result.text).toContain('Ask for input');
    expect(result.text).toContain('data is ambiguous');
    expect(result.text).toContain('Ask for clarification');
  });

  it('should render preset through .prompt pipeline', async () => {
    const source = `
<Prompt name="edge-cases-preset" bare>
  <Task>Help me write code.</Task>
  <EdgeCases preset="standard" />
</Prompt>
`;
    const element = await createPromptFromSource(source, 'edge-cases-preset.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('missing required data');
  });

  describe('snapshots', () => {
    it('should match snapshot: edge cases with When children', async () => {
      const element = jsxs(EdgeCases, {
        children: [
          jsx(When, { condition: 'input is empty', children: 'Ask for input' }),
          jsx(When, { condition: 'data is ambiguous', children: 'Ask for clarification' }),
        ],
      });
      const result = await render(element);
      expect(result.text).toMatchSnapshot();
    });
  });
});
