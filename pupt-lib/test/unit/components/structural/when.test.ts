import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/render';
import { jsx } from '../../../../src/jsx-runtime';
import { When } from '../../../../components/structural/When';

describe('When', () => {
  it('should render condition with children action', async () => {
    const element = jsx(When, {
      condition: 'input is empty',
      children: 'Ask for input',
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('input is empty');
    expect(result.text).toContain('Ask for input');
  });

  it('should render condition with then prop', async () => {
    const element = jsx(When, {
      condition: 'data is ambiguous',
      then: 'Ask for clarification',
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('data is ambiguous');
    expect(result.text).toContain('Ask for clarification');
  });

  it('should prefer children over then prop', async () => {
    const element = jsx(When, {
      condition: 'error occurs',
      then: 'from then prop',
      children: 'from children',
    });
    const result = await render(element);
    expect(result.text).toContain('from children');
    expect(result.text).not.toContain('from then prop');
  });

  it('should render condition-only when no action provided', async () => {
    const element = jsx(When, {
      condition: 'something happens',
    });
    const result = await render(element);
    expect(result.text).toContain('When something happens');
  });

  it('should wrap in XML tags by default', async () => {
    const element = jsx(When, {
      condition: 'test',
      children: 'action',
    });
    const result = await render(element);
    expect(result.text).toContain('<when>');
    expect(result.text).toContain('</when>');
  });

  it('should support markdown delimiter', async () => {
    const element = jsx(When, {
      condition: 'test',
      children: 'action',
      delimiter: 'markdown',
    });
    const result = await render(element);
    expect(result.text).toContain('## when');
    expect(result.text).not.toContain('<when>');
  });

  it('should support none delimiter', async () => {
    const element = jsx(When, {
      condition: 'test',
      children: 'action',
      delimiter: 'none',
    });
    const result = await render(element);
    expect(result.text).not.toContain('<when>');
    expect(result.text).not.toContain('## when');
    expect(result.text).toContain('When test: action');
  });
});
