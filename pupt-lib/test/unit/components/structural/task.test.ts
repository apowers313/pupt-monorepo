import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/render';
import { jsx } from '../../../../src/jsx-runtime';
import { Task } from '../../../../src/components/structural/Task';

describe('Task', () => {
  it('should render with XML delimiters by default', () => {
    const element = jsx(Task, {
      children: 'Write a function that sorts an array.',
    });

    const result = render(element);
    expect(result.text).toContain('<task>');
    expect(result.text).toContain('</task>');
    expect(result.text).toContain('Write a function that sorts an array.');
  });

  it('should support markdown delimiter', () => {
    const element = jsx(Task, {
      delimiter: 'markdown',
      children: 'Review the code for bugs',
    });

    const result = render(element);
    expect(result.text).toContain('## task');
    expect(result.text).toContain('Review the code for bugs');
  });

  it('should support no delimiter', () => {
    const element = jsx(Task, {
      delimiter: 'none',
      children: 'Just do it',
    });

    const result = render(element);
    expect(result.text).not.toContain('<task>');
    expect(result.text).not.toContain('## task');
    expect(result.text).toContain('Just do it');
  });
});
