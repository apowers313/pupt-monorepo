import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/render';
import { jsx } from '../../../../src/jsx-runtime';
import { Context } from '../../../../components/structural/Context';

describe('Context', () => {
  it('should render with XML delimiters by default', async () => {
    const element = jsx(Context, {
      children: 'The user is building a web application.',
    });

    const result = await render(element);
    expect(result.text).toContain('<context>');
    expect(result.text).toContain('</context>');
    expect(result.text).toContain('The user is building a web application.');
  });

  it('should support markdown delimiter', async () => {
    const element = jsx(Context, {
      delimiter: 'markdown',
      children: 'Working on a Node.js project',
    });

    const result = await render(element);
    expect(result.text).toContain('## context');
    expect(result.text).toContain('Working on a Node.js project');
  });

  it('should support no delimiter', async () => {
    const element = jsx(Context, {
      delimiter: 'none',
      children: 'Background information here',
    });

    const result = await render(element);
    expect(result.text).not.toContain('<context>');
    expect(result.text).not.toContain('## context');
    expect(result.text).toContain('Background information here');
  });
});
