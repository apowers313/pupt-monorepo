import { describe, expect,it } from 'vitest';

import { ChainOfThought } from '../../../components/reasoning/ChainOfThought';
import { createPromptFromSource } from '../../../src/create-prompt';
import { jsx } from '../../../src/jsx-runtime';
import { render } from '../../../src/render';

describe('ChainOfThought e2e', () => {
  it('should render step-by-step through .prompt pipeline', async () => {
    const source = `
<Prompt name="cot-step" bare>
  <Task>Solve the problem.</Task>
  <ChainOfThought style="step-by-step" />
</Prompt>
`;
    const element = await createPromptFromSource(source, 'cot-step.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('step by step');
  });

  it('should render structured style through pipeline', async () => {
    const source = `
<Prompt name="cot-structured" bare>
  <Task>Solve the problem.</Task>
  <ChainOfThought style="structured" />
</Prompt>
`;
    const element = await createPromptFromSource(source, 'cot-structured.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('Understanding');
    expect(result.text).toContain('Analysis');
    expect(result.text).toContain('Conclusion');
  });

  it('should render with hidden reasoning through pipeline', async () => {
    const source = `
<Prompt name="cot-hidden" bare>
  <Task>Solve the problem.</Task>
  <ChainOfThought showReasoning={false} />
</Prompt>
`;
    const element = await createPromptFromSource(source, 'cot-hidden.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).not.toContain('Show your reasoning');
  });

  describe('snapshots', () => {
    it('should match snapshot: each style', async () => {
      const styles = ['step-by-step', 'think-aloud', 'structured', 'minimal'] as const;
      for (const style of styles) {
        const element = jsx(ChainOfThought, { style });
        const result = await render(element);
        expect(result.text).toMatchSnapshot();
      }
    });
  });
});
