import { describe, it, expect } from 'vitest';
import { render } from '../../../src/render';
import { jsx, jsxs } from '../../../src/jsx-runtime';
import { Prompt } from '../../../components/structural/Prompt';
import { Contexts } from '../../../components/structural/Contexts';
import { Context } from '../../../components/structural/Context';
import { Task } from '../../../components/structural/Task';

describe('Contexts container e2e', () => {
  it('should render multiple contexts in container', async () => {
    const element = jsxs(Contexts, {
      children: [
        jsx(Context, { label: 'Background', children: 'User is a beginner' }),
        jsx(Context, { label: 'Domain', children: 'Web development' }),
      ],
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toMatchSnapshot();
    expect(result.text).toContain('Background');
    expect(result.text).toContain('User is a beginner');
    expect(result.text).toContain('Domain');
    expect(result.text).toContain('Web development');
  });

  it('should render Contexts inside Prompt', async () => {
    const element = jsxs(Prompt, {
      name: 'contexts-test',
      children: [
        jsxs(Contexts, {
          children: [
            jsx(Context, { label: 'Background', children: 'Important background' }),
            jsx(Context, { label: 'Data', children: 'Some data context' }),
          ],
        }),
        jsx(Task, { children: 'Analyze the data' }),
      ],
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toMatchSnapshot();
    expect(result.text).toContain('Important background');
    expect(result.text).toContain('Some data context');
    expect(result.text).toContain('Analyze the data');
  });

  it('should support extend prop in Contexts inside Prompt', async () => {
    const element = jsxs(Prompt, {
      name: 'extend-contexts-test',
      children: [
        jsx(Contexts, {
          extend: true,
          children: jsx(Context, { label: 'Extra', children: 'Extra context' }),
        }),
        jsx(Task, { children: 'Do a task' }),
      ],
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('Extra context');
  });
});
