import { describe, expect,it } from 'vitest';

import { Task } from '../../../../components/structural/Task';
import { jsx } from '../../../../src/jsx-runtime';
import { render } from '../../../../src/render';

describe('Task', () => {
  it('should render with XML delimiters by default', async () => {
    const element = jsx(Task, {
      children: 'Write a function that sorts an array.',
    });

    const result = await render(element);
    expect(result.text).toContain('<task>');
    expect(result.text).toContain('</task>');
    expect(result.text).toContain('Write a function that sorts an array.');
  });

  it('should support markdown delimiter', async () => {
    const element = jsx(Task, {
      delimiter: 'markdown',
      children: 'Review the code for bugs',
    });

    const result = await render(element);
    expect(result.text).toContain('## task');
    expect(result.text).toContain('Review the code for bugs');
  });

  it('should support no delimiter', async () => {
    const element = jsx(Task, {
      delimiter: 'none',
      children: 'Just do it',
    });

    const result = await render(element);
    expect(result.text).not.toContain('<task>');
    expect(result.text).not.toContain('## task');
    expect(result.text).toContain('Just do it');
  });
});
