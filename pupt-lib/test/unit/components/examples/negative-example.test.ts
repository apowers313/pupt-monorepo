import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/render';
import { jsx } from '../../../../src/jsx-runtime';
import { NegativeExample } from '../../../../components/examples/NegativeExample';

describe('NegativeExample', () => {
  it('should render bad example wrapper', async () => {
    const element = jsx(NegativeExample, {
      children: 'This is a bad response',
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('<bad-example>');
    expect(result.text).toContain('</bad-example>');
    expect(result.text).toContain('This is a bad response');
  });

  it('should render reason when provided', async () => {
    const element = jsx(NegativeExample, {
      reason: 'Too verbose and includes personal opinions',
      children: 'I think this is a really interesting article about...',
    });
    const result = await render(element);
    expect(result.text).toContain('Too verbose and includes personal opinions');
    expect(result.text).toContain('Reason this is wrong');
  });

  it('should not render reason when not provided', async () => {
    const element = jsx(NegativeExample, {
      children: 'Bad response',
    });
    const result = await render(element);
    expect(result.text).not.toContain('Reason');
  });

  it('should render children content', async () => {
    const element = jsx(NegativeExample, {
      children: 'Here is an example of what NOT to do',
    });
    const result = await render(element);
    expect(result.text).toContain('Here is an example of what NOT to do');
  });

  it('should wrap content in bad-example tags', async () => {
    const element = jsx(NegativeExample, {
      reason: 'Hallucinated facts',
      children: 'The Earth has 3 moons',
    });
    const result = await render(element);
    const text = result.text;
    const badExampleStart = text.indexOf('<bad-example>');
    const content = text.indexOf('The Earth has 3 moons');
    const reason = text.indexOf('Reason this is wrong');
    const badExampleEnd = text.indexOf('</bad-example>');
    // Content should be between bad-example tags
    expect(badExampleStart).toBeLessThan(content);
    expect(content).toBeLessThan(badExampleEnd);
    expect(reason).toBeLessThan(badExampleEnd);
  });
});
