import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/render';
import { jsx } from '../../../../src/jsx-runtime';
import { Audience } from '../../../../src/components/structural/Audience';

describe('Audience', () => {
  it('should render with XML delimiters by default', () => {
    const element = jsx(Audience, {
      children: 'Technical users familiar with APIs',
    });

    const result = render(element);
    expect(result.text).toContain('<audience>');
    expect(result.text).toContain('</audience>');
    expect(result.text).toContain('Technical users familiar with APIs');
  });

  it('should support markdown delimiter', () => {
    const element = jsx(Audience, {
      delimiter: 'markdown',
      children: 'Beginners learning to code',
    });

    const result = render(element);
    expect(result.text).toContain('## audience');
    expect(result.text).toContain('Beginners learning to code');
  });

  it('should support no delimiter', () => {
    const element = jsx(Audience, {
      delimiter: 'none',
      children: 'General audience',
    });

    const result = render(element);
    expect(result.text).not.toContain('<audience>');
    expect(result.text).not.toContain('## audience');
    expect(result.text).toContain('General audience');
  });
});
