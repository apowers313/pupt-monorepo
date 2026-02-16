import { describe, expect,it } from 'vitest';

import { Tone } from '../../../../components/structural/Tone';
import { jsx } from '../../../../src/jsx-runtime';
import { render } from '../../../../src/render';

describe('Tone', () => {
  it('should render with XML delimiters by default', async () => {
    const element = jsx(Tone, {
      children: 'Professional and concise',
    });

    const result = await render(element);
    expect(result.text).toContain('<tone>');
    expect(result.text).toContain('</tone>');
    expect(result.text).toContain('Professional and concise');
  });

  it('should support markdown delimiter', async () => {
    const element = jsx(Tone, {
      delimiter: 'markdown',
      children: 'Friendly and approachable',
    });

    const result = await render(element);
    expect(result.text).toContain('## tone');
    expect(result.text).toContain('Friendly and approachable');
  });

  it('should support no delimiter', async () => {
    const element = jsx(Tone, {
      delimiter: 'none',
      children: 'Casual',
    });

    const result = await render(element);
    expect(result.text).not.toContain('<tone>');
    expect(result.text).not.toContain('## tone');
    expect(result.text).toContain('Casual');
  });
});
