import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/render';
import { jsx } from '../../../../src/jsx-runtime';
import { Tone } from '../../../../src/components/structural/Tone';

describe('Tone', () => {
  it('should render with XML delimiters by default', () => {
    const element = jsx(Tone, {
      children: 'Professional and concise',
    });

    const result = render(element);
    expect(result.text).toContain('<tone>');
    expect(result.text).toContain('</tone>');
    expect(result.text).toContain('Professional and concise');
  });

  it('should support markdown delimiter', () => {
    const element = jsx(Tone, {
      delimiter: 'markdown',
      children: 'Friendly and approachable',
    });

    const result = render(element);
    expect(result.text).toContain('## tone');
    expect(result.text).toContain('Friendly and approachable');
  });

  it('should support no delimiter', () => {
    const element = jsx(Tone, {
      delimiter: 'none',
      children: 'Casual',
    });

    const result = render(element);
    expect(result.text).not.toContain('<tone>');
    expect(result.text).not.toContain('## tone');
    expect(result.text).toContain('Casual');
  });
});
