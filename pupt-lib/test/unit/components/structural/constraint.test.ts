import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/render';
import { jsx } from '../../../../src/jsx-runtime';
import { Constraint } from '../../../../src/components/structural/Constraint';

describe('Constraint', () => {
  it('should render must constraint with XML tags', async () => {
    const element = jsx(Constraint, {
      type: 'must',
      children: 'Include error handling',
    });

    const result = await render(element);
    expect(result.text).toContain('<constraint>');
    expect(result.text).toContain('</constraint>');
    expect(result.text).toContain('MUST: Include error handling');
  });

  it('should render should constraint with XML tags', async () => {
    const element = jsx(Constraint, {
      type: 'should',
      children: 'Use descriptive variable names',
    });

    const result = await render(element);
    expect(result.text).toContain('<constraint>');
    expect(result.text).toContain('SHOULD: Use descriptive variable names');
  });

  it('should render must-not constraint with XML tags', async () => {
    const element = jsx(Constraint, {
      type: 'must-not',
      children: 'Expose sensitive data',
    });

    const result = await render(element);
    expect(result.text).toContain('<constraint>');
    expect(result.text).toContain('MUST NOT: Expose sensitive data');
  });

  it('should render without type prefix when type is not specified', async () => {
    const element = jsx(Constraint, {
      children: 'Some constraint content',
    });

    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('<constraint>');
    expect(result.text).toContain('Some constraint content');
    expect(result.text).not.toContain('MUST');
    expect(result.text).not.toContain('SHOULD');
  });

  it('should render with markdown delimiter', async () => {
    const element = jsx(Constraint, {
      type: 'must',
      delimiter: 'markdown',
      children: 'Include error handling',
    });

    const result = await render(element);
    expect(result.text).toContain('## constraint');
    expect(result.text).toContain('MUST: Include error handling');
    expect(result.text).not.toContain('<constraint>');
  });

  it('should render without wrapper when delimiter is none', async () => {
    const element = jsx(Constraint, {
      type: 'must',
      delimiter: 'none',
      children: 'Include error handling',
    });

    const result = await render(element);
    expect(result.text).toBe('MUST: Include error handling');
    expect(result.text).not.toContain('<constraint>');
  });
});
