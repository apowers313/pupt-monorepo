import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/render';
import { jsx } from '../../../../src/jsx-runtime';
import { Task } from '../../../../components/structural/Task';

describe('Task presets', () => {
  it('should render code-review preset', async () => {
    const element = jsx(Task, { preset: 'code-review' });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('Review');
  });

  it('should render preset with subject and objective', async () => {
    const element = jsx(Task, {
      preset: 'code-review',
      subject: 'the PR',
      objective: 'find bugs',
    });
    const result = await render(element);
    expect(result.text).toContain('the PR');
    expect(result.text).toContain('find bugs');
  });

  it('should render summarize preset', async () => {
    const element = jsx(Task, { preset: 'summarize' });
    const result = await render(element);
    expect(result.text).toContain('Summarize');
  });

  it('should use custom verb over preset', async () => {
    const element = jsx(Task, { preset: 'code-review', verb: 'Inspect' });
    const result = await render(element);
    expect(result.text).toContain('Inspect');
  });

  it('should prefer children over preset', async () => {
    const element = jsx(Task, { preset: 'code-review', children: 'Custom task text' });
    const result = await render(element);
    expect(result.text).toContain('Custom task text');
  });

  it('should render scope qualifier', async () => {
    const element = jsx(Task, { preset: 'explain', scope: 'comprehensive' });
    const result = await render(element);
    expect(result.text).toContain('comprehensive');
  });

  it('should render complexity qualifier', async () => {
    const element = jsx(Task, { preset: 'explain', complexity: 'complex' });
    const result = await render(element);
    expect(result.text).toContain('edge cases');
  });

  it('should fall back to Complete verb when no preset', async () => {
    const element = jsx(Task, { subject: 'the task' });
    const result = await render(element);
    expect(result.text).toContain('Complete the task');
  });
});
