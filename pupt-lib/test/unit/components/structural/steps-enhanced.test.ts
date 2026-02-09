import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/render';
import { jsx } from '../../../../src/jsx-runtime';
import { Steps } from '../../../../components/reasoning/Steps';
import { Step } from '../../../../components/reasoning/Step';

describe('Steps presets', () => {
  it('should render problem-solving preset', async () => {
    const element = jsx(Steps, { preset: 'problem-solving' });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('Define');
    expect(result.text).toContain('Explore');
    expect(result.text).toContain('Solve');
    expect(result.text).toContain('Verify');
  });

  it('should render analysis preset', async () => {
    const element = jsx(Steps, { preset: 'analysis' });
    const result = await render(element);
    expect(result.text).toContain('Understand');
    expect(result.text).toContain('Analyze');
    expect(result.text).toContain('Conclude');
  });

  it('should render code-generation preset', async () => {
    const element = jsx(Steps, { preset: 'code-generation' });
    const result = await render(element);
    expect(result.text).toContain('Understand requirements');
    expect(result.text).toContain('Design approach');
    expect(result.text).toContain('Implement');
    expect(result.text).toContain('Test');
  });
});

describe('Steps style', () => {
  it('should render step-by-step style instruction', async () => {
    const element = jsx(Steps, {
      style: 'step-by-step',
      children: jsx(Step, { children: 'First step' }),
    });
    const result = await render(element);
    expect(result.text).toContain('Think through this step by step');
  });

  it('should render think-aloud style instruction', async () => {
    const element = jsx(Steps, {
      style: 'think-aloud',
      children: jsx(Step, { children: 'First step' }),
    });
    const result = await render(element);
    expect(result.text).toContain('thought process');
  });

  it('should render structured style instruction', async () => {
    const element = jsx(Steps, {
      style: 'structured',
      children: jsx(Step, { children: 'First step' }),
    });
    const result = await render(element);
    expect(result.text).toContain('structured approach');
  });

  it('should render minimal style instruction', async () => {
    const element = jsx(Steps, {
      style: 'minimal',
      children: jsx(Step, { children: 'First step' }),
    });
    const result = await render(element);
    expect(result.text).toContain('Consider carefully');
  });
});

describe('Steps verify and selfCritique', () => {
  it('should add verification step', async () => {
    const element = jsx(Steps, {
      verify: true,
      children: jsx(Step, { children: 'Do something' }),
    });
    const result = await render(element);
    expect(result.text).toContain('Verify your answer');
  });

  it('should add self-critique step', async () => {
    const element = jsx(Steps, {
      selfCritique: true,
      children: jsx(Step, { children: 'Do something' }),
    });
    const result = await render(element);
    expect(result.text).toContain('Review your response');
  });

  it('should add both verify and selfCritique', async () => {
    const element = jsx(Steps, {
      verify: true,
      selfCritique: true,
      children: jsx(Step, { children: 'Do something' }),
    });
    const result = await render(element);
    expect(result.text).toContain('Verify your answer');
    expect(result.text).toContain('Review your response');
  });
});

describe('Steps showReasoning', () => {
  it('should add show reasoning instruction', async () => {
    const element = jsx(Steps, {
      showReasoning: true,
      children: jsx(Step, { children: 'Do something' }),
    });
    const result = await render(element);
    expect(result.text).toContain('Show your reasoning');
  });

  it('should inherit showReasoning from preset', async () => {
    const element = jsx(Steps, { preset: 'problem-solving' });
    const result = await render(element);
    expect(result.text).toContain('Show your reasoning');
  });
});

describe('Steps with children and preset', () => {
  it('should append children steps after preset phases', async () => {
    const element = jsx(Steps, {
      preset: 'analysis',
      children: jsx(Step, { children: 'Custom extra step' }),
    });
    const result = await render(element);
    // Preset phases
    expect(result.text).toContain('Understand');
    expect(result.text).toContain('Analyze');
    expect(result.text).toContain('Conclude');
    // Custom step should be numbered after preset
    expect(result.text).toContain('Custom extra step');
  });
});
