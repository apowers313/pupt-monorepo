import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/render';
import { jsx } from '../../../../src/jsx-runtime';
import { SuccessCriteria } from '../../../../components/structural/SuccessCriteria';
import { Criterion } from '../../../../components/structural/Criterion';

describe('SuccessCriteria', () => {
  it('should render with XML delimiters by default', async () => {
    const element = jsx(SuccessCriteria, {
      children: 'The response should be accurate and helpful.',
    });

    const result = await render(element);
    expect(result.text).toContain('<success-criteria>');
    expect(result.text).toContain('</success-criteria>');
    expect(result.text).toContain('The response should be accurate and helpful.');
  });

  it('should support markdown delimiter', async () => {
    const element = jsx(SuccessCriteria, {
      delimiter: 'markdown',
      children: 'Clear and actionable output',
    });

    const result = await render(element);
    expect(result.text).toContain('## success-criteria');
    expect(result.text).toContain('Clear and actionable output');
  });

  it('should support no delimiter', async () => {
    const element = jsx(SuccessCriteria, {
      delimiter: 'none',
      children: 'All tests pass',
    });

    const result = await render(element);
    expect(result.text).not.toContain('<success-criteria>');
    expect(result.text).not.toContain('## success-criteria');
    expect(result.text).toContain('All tests pass');
  });

  it('should render with Criterion children', async () => {
    const element = jsx(SuccessCriteria, {
      children: [
        jsx(Criterion, { children: 'Code compiles without errors' }),
        jsx(Criterion, { children: 'All tests pass' }),
      ],
    });

    const result = await render(element);
    expect(result.text).toContain('- Code compiles without errors');
    expect(result.text).toContain('- All tests pass');
  });
});

describe('Criterion', () => {
  it('should render as a list item', async () => {
    const element = jsx(Criterion, {
      children: 'Must be fast',
    });

    const result = await render(element);
    expect(result.text).toContain('- Must be fast');
  });
});
