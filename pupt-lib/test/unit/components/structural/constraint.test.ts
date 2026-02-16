import { describe, expect,it } from 'vitest';

import { Constraint } from '../../../../components/structural/Constraint';
import { jsx } from '../../../../src/jsx-runtime';
import { render } from '../../../../src/render';

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

  it('should render may constraint', async () => {
    const element = jsx(Constraint, {
      type: 'may',
      children: 'Include examples',
    });

    const result = await render(element);
    expect(result.text).toContain('MAY:');
    expect(result.text).toContain('Include examples');
  });

  it('should render should-not constraint', async () => {
    const element = jsx(Constraint, {
      type: 'should-not',
      children: 'Use jargon',
    });

    const result = await render(element);
    expect(result.text).toContain('SHOULD NOT:');
    expect(result.text).toContain('Use jargon');
  });
});
