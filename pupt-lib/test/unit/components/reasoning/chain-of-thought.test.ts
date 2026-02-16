import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/render';
import { jsx } from '../../../../src/jsx-runtime';
import { ChainOfThought } from '../../../../components/reasoning/ChainOfThought';

describe('ChainOfThought', () => {
  it('should render default step-by-step style', async () => {
    const element = jsx(ChainOfThought, {});
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('step by step');
  });

  it('should render with XML delimiters by default', async () => {
    const element = jsx(ChainOfThought, {});
    const result = await render(element);
    expect(result.text).toContain('<reasoning>');
    expect(result.text).toContain('</reasoning>');
  });

  it('should render step-by-step style', async () => {
    const element = jsx(ChainOfThought, { style: 'step-by-step' });
    const result = await render(element);
    expect(result.text).toContain('step by step');
  });

  it('should render think-aloud style', async () => {
    const element = jsx(ChainOfThought, { style: 'think-aloud' });
    const result = await render(element);
    expect(result.text).toContain('thought process');
  });

  it('should render structured style', async () => {
    const element = jsx(ChainOfThought, { style: 'structured' });
    const result = await render(element);
    expect(result.text).toContain('Understanding');
    expect(result.text).toContain('Analysis');
    expect(result.text).toContain('Conclusion');
  });

  it('should render minimal style', async () => {
    const element = jsx(ChainOfThought, { style: 'minimal' });
    const result = await render(element);
    expect(result.text).toContain('carefully');
  });

  it('should show reasoning by default', async () => {
    const element = jsx(ChainOfThought, {});
    const result = await render(element);
    expect(result.text).toContain('Show your reasoning');
  });

  it('should hide reasoning when showReasoning is false', async () => {
    const element = jsx(ChainOfThought, { showReasoning: false });
    const result = await render(element);
    expect(result.text).not.toContain('Show your reasoning');
  });

  it('should render custom children', async () => {
    const element = jsx(ChainOfThought, {
      children: 'First analyze the data, then draw conclusions.',
    });
    const result = await render(element);
    expect(result.text).toContain('First analyze the data');
  });

  it('should support markdown delimiter', async () => {
    const element = jsx(ChainOfThought, {
      delimiter: 'markdown',
    });
    const result = await render(element);
    expect(result.text).toContain('## reasoning');
    expect(result.text).not.toContain('<reasoning>');
  });

  it('should support none delimiter', async () => {
    const element = jsx(ChainOfThought, {
      delimiter: 'none',
    });
    const result = await render(element);
    expect(result.text).not.toContain('<reasoning>');
    expect(result.text).not.toContain('## reasoning');
  });
});
