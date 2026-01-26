import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/render';
import { jsx } from '../../../../src/jsx-runtime';
import { SuccessCriteria } from '../../../../src/components/structural/SuccessCriteria';
import { Criterion } from '../../../../src/components/structural/Criterion';

describe('SuccessCriteria', () => {
  it('should render with XML delimiters by default', () => {
    const element = jsx(SuccessCriteria, {
      children: 'The response should be accurate and helpful.',
    });

    const result = render(element);
    expect(result.text).toContain('<success-criteria>');
    expect(result.text).toContain('</success-criteria>');
    expect(result.text).toContain('The response should be accurate and helpful.');
  });

  it('should support markdown delimiter', () => {
    const element = jsx(SuccessCriteria, {
      delimiter: 'markdown',
      children: 'Clear and actionable output',
    });

    const result = render(element);
    expect(result.text).toContain('## success-criteria');
    expect(result.text).toContain('Clear and actionable output');
  });

  it('should support no delimiter', () => {
    const element = jsx(SuccessCriteria, {
      delimiter: 'none',
      children: 'All tests pass',
    });

    const result = render(element);
    expect(result.text).not.toContain('<success-criteria>');
    expect(result.text).not.toContain('## success-criteria');
    expect(result.text).toContain('All tests pass');
  });

  it('should render with Criterion children', () => {
    const element = jsx(SuccessCriteria, {
      children: [
        jsx(Criterion, { children: 'Code compiles without errors' }),
        jsx(Criterion, { children: 'All tests pass' }),
      ],
    });

    const result = render(element);
    expect(result.text).toContain('- Code compiles without errors');
    expect(result.text).toContain('- All tests pass');
  });
});

describe('Criterion', () => {
  it('should render as a list item', () => {
    const element = jsx(Criterion, {
      children: 'Must be fast',
    });

    const result = render(element);
    expect(result.text).toContain('- Must be fast');
  });
});
