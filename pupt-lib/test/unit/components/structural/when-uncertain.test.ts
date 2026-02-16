import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/render';
import { jsx } from '../../../../src/jsx-runtime';
import { WhenUncertain } from '../../../../components/structural/WhenUncertain';

describe('WhenUncertain', () => {
  it('should render default acknowledge action', async () => {
    const element = jsx(WhenUncertain, {});
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('not certain');
  });

  it('should render with XML delimiters by default', async () => {
    const element = jsx(WhenUncertain, {});
    const result = await render(element);
    expect(result.text).toContain('<uncertainty-handling>');
    expect(result.text).toContain('</uncertainty-handling>');
  });

  it('should render acknowledge action', async () => {
    const element = jsx(WhenUncertain, { action: 'acknowledge' });
    const result = await render(element);
    expect(result.text).toContain('not certain');
  });

  it('should render ask action', async () => {
    const element = jsx(WhenUncertain, { action: 'ask' });
    const result = await render(element);
    expect(result.text).toContain('clarifying questions');
  });

  it('should render decline action', async () => {
    const element = jsx(WhenUncertain, { action: 'decline' });
    const result = await render(element);
    expect(result.text).toContain('decline');
  });

  it('should render estimate action', async () => {
    const element = jsx(WhenUncertain, { action: 'estimate' });
    const result = await render(element);
    expect(result.text).toContain('best estimate');
  });

  it('should render custom children instead of default text', async () => {
    const element = jsx(WhenUncertain, {
      children: 'When in doubt, provide a range of possible answers.',
    });
    const result = await render(element);
    expect(result.text).toContain('range of possible answers');
  });

  it('should support markdown delimiter', async () => {
    const element = jsx(WhenUncertain, {
      action: 'ask',
      delimiter: 'markdown',
    });
    const result = await render(element);
    expect(result.text).toContain('## uncertainty-handling');
    expect(result.text).not.toContain('<uncertainty-handling>');
  });

  it('should support none delimiter', async () => {
    const element = jsx(WhenUncertain, {
      action: 'ask',
      delimiter: 'none',
    });
    const result = await render(element);
    expect(result.text).not.toContain('<uncertainty-handling>');
    expect(result.text).not.toContain('## uncertainty-handling');
  });
});
