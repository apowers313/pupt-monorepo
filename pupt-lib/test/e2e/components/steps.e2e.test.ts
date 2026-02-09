import { describe, it, expect } from 'vitest';
import { createPromptFromSource } from '../../../src/create-prompt';
import { render } from '../../../src/render';
import { jsx, Fragment } from '../../../src/jsx-runtime';
import { Steps } from '../../../components/reasoning/Steps';
import { Step } from '../../../components/reasoning/Step';

describe('Steps e2e', () => {
  it('should render steps through .prompt pipeline', async () => {
    const source = `
<Prompt name="steps-test" bare>
  <Steps>
    <Step>Parse input</Step>
    <Step>Validate data</Step>
    <Step>Process result</Step>
  </Steps>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'steps-test.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toMatch(/1\..*Parse input/s);
    expect(result.text).toMatch(/2\..*Validate data/s);
    expect(result.text).toMatch(/3\..*Process result/s);
  });

  it('should auto-number steps through Fragments', async () => {
    const element = jsx(Steps, {
      children: jsx(Fragment, {
        children: [
          jsx(Step, { children: 'First step' }),
          jsx(Step, { children: 'Second step' }),
          jsx(Step, { children: 'Third step' }),
        ],
      }),
    });

    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toMatch(/1\..*First step/s);
    expect(result.text).toMatch(/2\..*Second step/s);
    expect(result.text).toMatch(/3\..*Third step/s);
  });

  it('should render preset through .prompt pipeline', async () => {
    const source = `
<Prompt name="steps-preset" bare>
  <Steps preset="problem-solving" />
</Prompt>
`;
    const element = await createPromptFromSource(source, 'steps-preset.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('Define');
  });

  it('should render with verify and selfCritique', async () => {
    const element = jsx(Steps, {
      verify: true,
      selfCritique: true,
      children: [
        jsx(Step, { children: 'Analyze the problem' }),
        jsx(Step, { children: 'Propose solution' }),
      ],
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('Verify');
    expect(result.text).toContain('Review your response');
  });

  describe('snapshots', () => {
    it('should match snapshot: basic numbered steps', async () => {
      const element = jsx(Steps, {
        children: [
          jsx(Step, { children: 'Parse input' }),
          jsx(Step, { children: 'Validate data' }),
          jsx(Step, { children: 'Process result' }),
        ],
      });
      const result = await render(element);
      expect(result.text).toMatchSnapshot();
    });

    it('should match snapshot: steps through Fragment', async () => {
      const element = jsx(Steps, {
        children: jsx(Fragment, {
          children: [
            jsx(Step, { children: 'Step A' }),
            jsx(Step, { children: 'Step B' }),
          ],
        }),
      });
      const result = await render(element);
      expect(result.text).toMatchSnapshot();
    });

    it('should match snapshot: preset problem-solving', async () => {
      const element = jsx(Steps, { preset: 'problem-solving' });
      const result = await render(element);
      expect(result.text).toMatchSnapshot();
    });

    it('should match snapshot: steps with verify and selfCritique', async () => {
      const element = jsx(Steps, {
        verify: true,
        selfCritique: true,
        children: [
          jsx(Step, { children: 'Think' }),
          jsx(Step, { children: 'Act' }),
        ],
      });
      const result = await render(element);
      expect(result.text).toMatchSnapshot();
    });
  });
});
