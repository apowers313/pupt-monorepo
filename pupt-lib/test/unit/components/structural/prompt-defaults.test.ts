import { describe, expect,it } from 'vitest';

import { Constraint } from '../../../../components/structural/Constraint';
import { Format } from '../../../../components/structural/Format';
import { Prompt } from '../../../../components/structural/Prompt';
import { Role } from '../../../../components/structural/Role';
import { Task } from '../../../../components/structural/Task';
import { Fragment,jsx } from '../../../../src/jsx-runtime';
import { render } from '../../../../src/render';

describe('Prompt defaults system', () => {
  it('should render default role when no Role child is provided', async () => {
    const element = jsx(Prompt, {
      name: 'test',
      children: jsx(Task, { children: 'Do something' }),
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('Assistant');
    expect(result.text).toContain('Do something');
  });

  it('should NOT render default role when Role child IS provided', async () => {
    const element = jsx(Prompt, {
      name: 'test',
      children: [
        jsx(Role, { children: 'Custom role text' }),
        jsx(Task, { children: 'Do something' }),
      ],
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('Custom role text');
    // Count occurrences of 'role' tags to ensure no duplicate Role section
    const roleTagCount = (result.text.match(/<role>/g) || []).length;
    expect(roleTagCount).toBe(1);
  });

  it('should render no defaults when bare=true', async () => {
    const element = jsx(Prompt, {
      name: 'test',
      bare: true,
      children: jsx(Task, { children: 'Do something' }),
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('Do something');
    // No auto-generated role or constraints
    expect(result.text).not.toContain('Assistant');
    expect(result.text).not.toContain('concise');
  });

  it('should accept role shorthand prop', async () => {
    const element = jsx(Prompt, {
      name: 'test',
      role: 'engineer',
      children: jsx(Task, { children: 'Review code' }),
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('Software Engineer');
  });

  it('should render default constraints when no Constraint children', async () => {
    const element = jsx(Prompt, {
      name: 'test',
      children: jsx(Task, { children: 'Do something' }),
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('concise');
  });

  it('should NOT render default constraints when Constraint child IS provided', async () => {
    const element = jsx(Prompt, {
      name: 'test',
      children: [
        jsx(Task, { children: 'Do something' }),
        jsx(Constraint, { type: 'must', children: 'Custom constraint' }),
      ],
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('Custom constraint');
    // Should not contain default constraint text
    expect(result.text).not.toContain('concise');
  });

  it('should NOT render default format when Format child IS provided', async () => {
    const element = jsx(Prompt, {
      name: 'test',
      children: [
        jsx(Task, { children: 'Do something' }),
        jsx(Format, { type: 'json' }),
      ],
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('json');
    // Should have only one format section
    const formatTagCount = (result.text.match(/<format>/g) || []).length;
    expect(formatTagCount).toBe(1);
  });

  it('should respect defaults object for fine-grained control', async () => {
    const element = jsx(Prompt, {
      name: 'test',
      defaults: { role: false, constraints: true },
      children: jsx(Task, { children: 'Do something' }),
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    // No auto role
    expect(result.text).not.toContain('Assistant');
    // Has constraints
    expect(result.text).toContain('concise');
  });

  it('should detect Role through Fragments', async () => {
    const element = jsx(Prompt, {
      name: 'test',
      children: [
        jsx(Fragment, {
          children: jsx(Role, { children: 'Nested role' }),
        }),
        jsx(Task, { children: 'Do something' }),
      ],
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('Nested role');
    // Should NOT also include default role
    const roleTagCount = (result.text.match(/<role>/g) || []).length;
    expect(roleTagCount).toBe(1);
  });

  it('should use expertise shorthand prop with role', async () => {
    const element = jsx(Prompt, {
      name: 'test',
      role: 'engineer',
      expertise: 'TypeScript',
      children: jsx(Task, { children: 'Review code' }),
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('Software Engineer');
    expect(result.text).toContain('TypeScript');
  });

  it('should render children content in correct position', async () => {
    const element = jsx(Prompt, {
      name: 'test',
      children: jsx(Task, { children: 'Do something' }),
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    // Role should come before task content
    const roleIdx = result.text.indexOf('<role>');
    const taskIdx = result.text.indexOf('<task>');
    expect(roleIdx).toBeLessThan(taskIdx);
  });

  it('should use role shorthand with unknown role name as title', async () => {
    const element = jsx(Prompt, {
      name: 'test',
      role: 'custom-specialist',
      children: jsx(Task, { children: 'Do work' }),
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('custom-specialist');
  });

  it('existing tests still pass: should render children', async () => {
    // Verify backward compat: bare mode makes it work like before
    const element = jsx(Prompt, {
      name: 'test-prompt',
      bare: true,
      children: 'Hello World',
    });
    const result = await render(element);
    expect(result.text).toContain('Hello World');
  });
});
