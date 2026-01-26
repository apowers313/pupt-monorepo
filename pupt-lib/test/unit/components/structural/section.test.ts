import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/render';
import { jsx } from '../../../../src/jsx-runtime';
import { Section } from '../../../../src/components/structural/Section';

describe('Section', () => {
  it('should render with XML delimiters', () => {
    const element = jsx(Section, {
      name: 'context',
      children: 'Some context here',
    });

    const result = render(element);
    expect(result.text).toContain('<context>');
    expect(result.text).toContain('</context>');
    expect(result.text).toContain('Some context here');
  });

  it('should support markdown delimiter', () => {
    const element = jsx(Section, {
      name: 'context',
      delimiter: 'markdown',
      children: 'Some context here',
    });

    const result = render(element);
    expect(result.text).toContain('## context');
  });

  it('should support no delimiter', () => {
    const element = jsx(Section, {
      name: 'context',
      delimiter: 'none',
      children: 'Some context here',
    });

    const result = render(element);
    expect(result.text).not.toContain('<context>');
    expect(result.text).not.toContain('## context');
    expect(result.text).toContain('Some context here');
  });
});
