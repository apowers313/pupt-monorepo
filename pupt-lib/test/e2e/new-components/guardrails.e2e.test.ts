import { describe, it, expect } from 'vitest';
import { createPromptFromSource } from '../../../src/create-prompt';
import { render } from '../../../src/render';
import { jsx } from '../../../src/jsx-runtime';
import { Guardrails } from '../../../components/structural/Guardrails';

describe('Guardrails e2e', () => {
  it('should render standard preset through .prompt pipeline', async () => {
    const source = `
<Prompt name="guardrails-standard" bare>
  <Task>Help me write code.</Task>
  <Guardrails preset="standard" />
</Prompt>
`;
    const element = await createPromptFromSource(source, 'guardrails-standard.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('harmful');
    expect(result.text).toContain('system prompts');
  });

  it('should render strict preset through .prompt pipeline', async () => {
    const source = `
<Prompt name="guardrails-strict" bare>
  <Task>Help me write code.</Task>
  <Guardrails preset="strict" />
</Prompt>
`;
    const element = await createPromptFromSource(source, 'guardrails-strict.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('harmful');
    expect(result.text).toContain('deception');
  });

  it('should render extend with prohibit/require through pipeline', async () => {
    const source = `
<Prompt name="guardrails-extend" bare>
  <Task>Help me write code.</Task>
  <Guardrails extend prohibit={['Discuss competitors']} require={['Always cite sources']} />
</Prompt>
`;
    const element = await createPromptFromSource(source, 'guardrails-extend.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('Discuss competitors');
    expect(result.text).toContain('Always cite sources');
  });

  describe('snapshots', () => {
    it('should match snapshot: standard preset', async () => {
      const element = jsx(Guardrails, { preset: 'standard' });
      const result = await render(element);
      expect(result.text).toMatchSnapshot();
    });

    it('should match snapshot: strict preset with prohibitions', async () => {
      const element = jsx(Guardrails, {
        preset: 'strict',
        prohibit: ['Share pricing details'],
        require: ['Always be polite'],
      });
      const result = await render(element);
      expect(result.text).toMatchSnapshot();
    });
  });
});
