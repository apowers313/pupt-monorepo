import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/render';
import { jsx } from '../../../../src/jsx-runtime';
import { Prompt } from '../../../../components/structural/Prompt';
import { Task } from '../../../../components/structural/Task';
import { Role } from '../../../../components/structural/Role';

describe('Prompt shorthand disable props', () => {
  it('should skip default role when noRole=true', async () => {
    const element = jsx(Prompt, {
      name: 'test',
      noRole: true,
      children: jsx(Task, { children: 'Do something' }),
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).not.toContain('Assistant');
    expect(result.text).toContain('Do something');
    // Should still have constraints and format
    expect(result.text).toContain('concise');
  });

  it('should skip default format when noFormat=true', async () => {
    const element = jsx(Prompt, {
      name: 'test',
      noFormat: true,
      children: jsx(Task, { children: 'Do something' }),
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    // Should have role and constraints but no format section
    expect(result.text).toContain('Assistant');
    expect(result.text).toContain('concise');
    expect(result.text).not.toContain('Output format');
  });

  it('should skip default constraints when noConstraints=true', async () => {
    const element = jsx(Prompt, {
      name: 'test',
      noConstraints: true,
      children: jsx(Task, { children: 'Do something' }),
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).not.toContain('concise');
    // Should still have role
    expect(result.text).toContain('Assistant');
  });

  it('should skip default success criteria when noSuccessCriteria=true', async () => {
    const element = jsx(Prompt, {
      name: 'test',
      noSuccessCriteria: true,
      defaults: { successCriteria: true },
      children: jsx(Task, { children: 'Do something' }),
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    // noSuccessCriteria should override defaults.successCriteria
    expect(result.text).not.toContain('success-criteria');
  });

  it('should treat defaults="none" as equivalent to bare', async () => {
    const element = jsx(Prompt, {
      name: 'test',
      defaults: 'none',
      children: jsx(Task, { children: 'Do something' }),
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    // Same as bare: only children, no auto-generated sections
    expect(result.text).not.toContain('Assistant');
    expect(result.text).not.toContain('concise');
    expect(result.text).not.toContain('Output format');
    expect(result.text).toContain('Do something');
  });

  it('defaults="none" should produce same output as bare=true', async () => {
    const bareElement = jsx(Prompt, {
      name: 'test',
      bare: true,
      children: jsx(Task, { children: 'Do something' }),
    });
    const defaultsNoneElement = jsx(Prompt, {
      name: 'test',
      defaults: 'none',
      children: jsx(Task, { children: 'Do something' }),
    });
    const bareResult = await render(bareElement);
    const defaultsNoneResult = await render(defaultsNoneElement);
    expect(bareResult.text).toBe(defaultsNoneResult.text);
  });

  it('shorthand noRole should be equivalent to defaults: { role: false }', async () => {
    const shorthandElement = jsx(Prompt, {
      name: 'test',
      noRole: true,
      children: jsx(Task, { children: 'Do something' }),
    });
    const defaultsElement = jsx(Prompt, {
      name: 'test',
      defaults: { role: false },
      children: jsx(Task, { children: 'Do something' }),
    });
    const shorthandResult = await render(shorthandElement);
    const defaultsResult = await render(defaultsElement);
    expect(shorthandResult.text).toBe(defaultsResult.text);
  });

  it('should allow combining multiple shorthand props', async () => {
    const element = jsx(Prompt, {
      name: 'test',
      noRole: true,
      noConstraints: true,
      children: jsx(Task, { children: 'Do something' }),
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).not.toContain('Assistant');
    expect(result.text).not.toContain('concise');
    expect(result.text).toContain('Do something');
  });

  it('explicit Role child should still suppress default role even without noRole', async () => {
    const element = jsx(Prompt, {
      name: 'test',
      children: [
        jsx(Role, { children: 'Custom role' }),
        jsx(Task, { children: 'Do something' }),
      ],
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('Custom role');
    const roleTagCount = (result.text.match(/<role>/g) || []).length;
    expect(roleTagCount).toBe(1);
  });
});
