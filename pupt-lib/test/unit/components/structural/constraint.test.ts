import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/render';
import { jsx } from '../../../../src/jsx-runtime';
import { Constraint } from '../../../../src/components/structural/Constraint';

describe('Constraint', () => {
  it('should render must constraint', async () => {
    const element = jsx(Constraint, {
      type: 'must',
      children: 'Include error handling',
    });

    const result = await render(element);
    expect(result.text).toContain('MUST: Include error handling');
  });

  it('should render should constraint', async () => {
    const element = jsx(Constraint, {
      type: 'should',
      children: 'Use descriptive variable names',
    });

    const result = await render(element);
    expect(result.text).toContain('SHOULD: Use descriptive variable names');
  });

  it('should render must-not constraint', async () => {
    const element = jsx(Constraint, {
      type: 'must-not',
      children: 'Expose sensitive data',
    });

    const result = await render(element);
    expect(result.text).toContain('MUST NOT: Expose sensitive data');
  });
});
