import { describe, expect,it } from 'vitest';

import { Fallback } from '../../../../components/structural/Fallback';
import { jsx } from '../../../../src/jsx-runtime';
import { render } from '../../../../src/render';

describe('Fallback', () => {
  it('should render when/then pair', async () => {
    const element = jsx(Fallback, {
      when: 'unable to complete the request',
      then: 'explain why and suggest alternatives',
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('unable to complete the request');
    expect(result.text).toContain('explain why and suggest alternatives');
  });

  it('should prefer children over then prop', async () => {
    const element = jsx(Fallback, {
      when: 'error occurs',
      then: 'from then prop',
      children: 'from children',
    });
    const result = await render(element);
    expect(result.text).toContain('from children');
    expect(result.text).not.toContain('from then prop');
  });

  it('should wrap in XML tags by default', async () => {
    const element = jsx(Fallback, {
      when: 'test',
      then: 'action',
    });
    const result = await render(element);
    expect(result.text).toContain('<fallback>');
    expect(result.text).toContain('</fallback>');
  });

  it('should support markdown delimiter', async () => {
    const element = jsx(Fallback, {
      when: 'test',
      then: 'action',
      delimiter: 'markdown',
    });
    const result = await render(element);
    expect(result.text).toContain('## fallback');
    expect(result.text).not.toContain('<fallback>');
  });

  it('should support none delimiter', async () => {
    const element = jsx(Fallback, {
      when: 'test',
      then: 'action',
      delimiter: 'none',
    });
    const result = await render(element);
    expect(result.text).not.toContain('<fallback>');
    expect(result.text).not.toContain('## fallback');
    expect(result.text).toContain('If test, then action');
  });

  it('should format as "If when, then action"', async () => {
    const element = jsx(Fallback, {
      when: 'missing info',
      then: 'ask questions',
      delimiter: 'none',
    });
    const result = await render(element);
    expect(result.text).toBe('If missing info, then ask questions');
  });
});
