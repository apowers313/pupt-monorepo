import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/render';
import { jsx } from '../../../../src/jsx-runtime';
import { Prompt } from '../../../../components/structural/Prompt';
import { Role } from '../../../../components/structural/Role';
import { Task } from '../../../../components/structural/Task';

describe('Prompt validation', () => {
  it('should warn when no Task child is provided', async () => {
    const element = jsx(Prompt, {
      name: 'test',
      children: jsx(Role, { children: 'A role without a task' }),
    });
    const result = await render(element);
    // Should succeed but include a warning in errors
    expect(result.errors?.some(e => e.message.includes('Task'))).toBe(true);
  });

  it('should not warn when Task child is provided', async () => {
    const element = jsx(Prompt, {
      name: 'test',
      children: [
        jsx(Role, { children: 'A role' }),
        jsx(Task, { children: 'Do something' }),
      ],
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    // No validation warnings about Task
    expect(result.errors?.some(e => e.message.includes('Task'))).toBeFalsy();
  });

  it('should not warn about Task in bare mode', async () => {
    const element = jsx(Prompt, {
      name: 'test',
      bare: true,
      children: jsx(Role, { children: 'A role without a task' }),
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    // No validation warnings in bare mode
    expect(result.errors?.some(e => e.message.includes('Task'))).toBeFalsy();
  });

  it('should detect Task in an array of children', async () => {
    const element = jsx(Prompt, {
      name: 'test',
      children: [jsx(Task, { children: 'Do something' })],
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.errors?.some(e => e.message.includes('Task'))).toBeFalsy();
  });

  it('should still render content when Task is missing', async () => {
    const element = jsx(Prompt, {
      name: 'test',
      children: jsx(Role, { children: 'A role without a task' }),
    });
    const result = await render(element);
    // Content should still render
    expect(result.text).toContain('A role without a task');
    // But warning should be present
    expect(result.errors?.some(e => e.message.includes('Task'))).toBe(true);
  });

  it('should include validation_warning code in the error', async () => {
    const element = jsx(Prompt, {
      name: 'test',
      children: 'Just text, no task',
    });
    const result = await render(element);
    const warning = result.errors?.find(e => e.message.includes('Task'));
    expect(warning).toBeDefined();
    expect(warning?.code).toBe('warn_missing_task');
    expect(warning?.component).toBe('Prompt');
  });
});
