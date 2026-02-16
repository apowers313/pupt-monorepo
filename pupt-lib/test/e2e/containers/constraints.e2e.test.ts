import { describe, expect,it } from 'vitest';

import { Constraint } from '../../../components/structural/Constraint';
import { Constraints } from '../../../components/structural/Constraints';
import { Prompt } from '../../../components/structural/Prompt';
import { Task } from '../../../components/structural/Task';
import { jsx, jsxs } from '../../../src/jsx-runtime';
import { render } from '../../../src/render';

describe('Constraints container e2e', () => {
  it('should extend default constraints in Prompt pipeline', async () => {
    const element = jsxs(Prompt, {
      name: 'extend-test',
      children: [
        jsxs(Constraints, {
          extend: true,
          children: [
            jsx(Constraint, { type: 'must', children: 'Include code examples' }),
          ],
        }),
        jsx(Task, { children: 'Explain TypeScript generics' }),
      ],
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toMatchSnapshot();
    // Verify both default and custom constraints present
    expect(result.text).toContain('Include code examples');
    expect(result.text).toContain('concise');
  });

  it('should replace default constraints in Prompt pipeline', async () => {
    const element = jsxs(Prompt, {
      name: 'replace-test',
      children: [
        jsxs(Constraints, {
          children: [
            jsx(Constraint, { type: 'must', children: 'Only this constraint' }),
            jsx(Constraint, { type: 'should', children: 'And this one' }),
          ],
        }),
        jsx(Task, { children: 'Do a task' }),
      ],
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toMatchSnapshot();
    expect(result.text).toContain('Only this constraint');
    expect(result.text).toContain('And this one');
    expect(result.text).not.toContain('Keep responses concise');
  });

  it('should exclude specific defaults when extending', async () => {
    const element = jsxs(Prompt, {
      name: 'exclude-test',
      children: [
        jsxs(Constraints, {
          extend: true,
          exclude: ['concise'],
          children: [
            jsx(Constraint, { type: 'must', children: 'Be verbose instead' }),
          ],
        }),
        jsx(Task, { children: 'Write documentation' }),
      ],
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toMatchSnapshot();
    expect(result.text).toContain('Be verbose instead');
    expect(result.text).not.toContain('concise');
    expect(result.text).toContain('accurate');
  });

  it('should render standalone Constraints with presets', async () => {
    const element = jsx(Constraints, {
      presets: ['be-concise', 'cite-sources', 'acknowledge-uncertainty'],
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toMatchSnapshot();
  });
});
