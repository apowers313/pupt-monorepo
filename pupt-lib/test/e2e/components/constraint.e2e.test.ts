import { describe, expect,it } from 'vitest';

import { Constraint } from '../../../components/structural/Constraint';
import { createPromptFromSource } from '../../../src/create-prompt';
import { jsx } from '../../../src/jsx-runtime';
import { render } from '../../../src/render';

describe('Constraint e2e', () => {
  it('should render all 5 constraint types through pipeline', async () => {
    const source = `
<Prompt name="constraint-types" bare>
  <Constraint type="must">Be accurate</Constraint>
  <Constraint type="should">Be concise</Constraint>
  <Constraint type="may">Include examples</Constraint>
  <Constraint type="must-not">Hallucinate</Constraint>
  <Constraint type="should-not">Use jargon</Constraint>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'constraint-types.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('MUST:');
    expect(result.text).toContain('SHOULD:');
    expect(result.text).toContain('MAY:');
    expect(result.text).toContain('MUST NOT:');
    expect(result.text).toContain('SHOULD NOT:');
    expect(result.text).toMatchSnapshot();
  });

  it('should render may constraint through pipeline', async () => {
    const source = `
<Prompt name="constraint-may" bare>
  <Constraint type="may">Include additional context</Constraint>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'constraint-may.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('MAY:');
    expect(result.text).toContain('Include additional context');
  });

  it('should render should-not constraint through pipeline', async () => {
    const source = `
<Prompt name="constraint-should-not" bare>
  <Constraint type="should-not">Use overly technical language</Constraint>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'constraint-should-not.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('SHOULD NOT:');
    expect(result.text).toContain('Use overly technical language');
  });

  it('should render preset through .prompt pipeline', async () => {
    const source = `
<Prompt name="constraint-preset" bare>
  <Constraint preset="be-concise" />
</Prompt>
`;
    const element = await createPromptFromSource(source, 'constraint-preset.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('concise');
  });

  it('should render positive framing with anthropic provider', async () => {
    const element = jsx(Constraint, {
      preset: 'no-hallucination',
    });
    const result = await render(element, { env: { llm: { provider: 'anthropic' } } });
    expect(result.ok).toBe(true);
    expect(result.text).toContain('MUST:');
    expect(result.text).toContain('verified');
  });

  describe('snapshots', () => {
    it('should match snapshot: may constraint with xml delimiter', async () => {
      const element = jsx(Constraint, { type: 'may', children: 'Include examples' });
      const result = await render(element);
      expect(result.text).toMatchSnapshot();
    });

    it('should match snapshot: should-not constraint with xml delimiter', async () => {
      const element = jsx(Constraint, { type: 'should-not', children: 'Use jargon' });
      const result = await render(element);
      expect(result.text).toMatchSnapshot();
    });

    it('should match snapshot: may constraint with markdown delimiter', async () => {
      const element = jsx(Constraint, { type: 'may', delimiter: 'markdown', children: 'Include examples' });
      const result = await render(element);
      expect(result.text).toMatchSnapshot();
    });

    it('should match snapshot: should-not constraint with none delimiter', async () => {
      const element = jsx(Constraint, { type: 'should-not', delimiter: 'none', children: 'Use jargon' });
      const result = await render(element);
      expect(result.text).toMatchSnapshot();
    });

    it('should match snapshot: preset be-concise', async () => {
      const element = jsx(Constraint, { preset: 'be-concise' });
      const result = await render(element);
      expect(result.text).toMatchSnapshot();
    });
  });
});
