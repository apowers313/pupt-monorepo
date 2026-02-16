import { describe, expect,it } from 'vitest';

import { Style } from '../../../../components/structural/Style';
import { jsx } from '../../../../src/jsx-runtime';
import { render } from '../../../../src/render';

describe('Style', () => {
  it('should render style type', async () => {
    const element = jsx(Style, { type: 'concise' });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('concise');
  });

  it('should render with XML delimiters by default', async () => {
    const element = jsx(Style, { type: 'concise' });
    const result = await render(element);
    expect(result.text).toContain('<style>');
    expect(result.text).toContain('</style>');
  });

  it('should render verbosity level', async () => {
    const element = jsx(Style, { verbosity: 'minimal' });
    const result = await render(element);
    expect(result.text).toContain('minimal');
  });

  it('should render formality level', async () => {
    const element = jsx(Style, { formality: 'formal' });
    const result = await render(element);
    expect(result.text).toContain('formal');
  });

  it('should render all style props together', async () => {
    const element = jsx(Style, {
      type: 'academic',
      verbosity: 'verbose',
      formality: 'formal',
    });
    const result = await render(element);
    expect(result.text).toContain('academic');
    expect(result.text).toContain('verbose');
    expect(result.text).toContain('formal');
  });

  it('should support markdown delimiter', async () => {
    const element = jsx(Style, {
      type: 'technical',
      delimiter: 'markdown',
    });
    const result = await render(element);
    expect(result.text).toContain('## style');
    expect(result.text).not.toContain('<style>');
  });

  it('should support none delimiter', async () => {
    const element = jsx(Style, {
      type: 'casual',
      delimiter: 'none',
    });
    const result = await render(element);
    expect(result.text).not.toContain('<style>');
    expect(result.text).not.toContain('## style');
    expect(result.text).toContain('casual');
  });

  it('should render custom children', async () => {
    const element = jsx(Style, {
      children: 'Write in a pirate voice',
    });
    const result = await render(element);
    expect(result.text).toContain('Write in a pirate voice');
  });

  it('should render all type options', async () => {
    const types = ['concise', 'detailed', 'academic', 'casual', 'technical', 'simple'] as const;
    for (const type of types) {
      const element = jsx(Style, { type });
      const result = await render(element);
      expect(result.ok).toBe(true);
      expect(result.text).toContain(type);
    }
  });
});
