import { describe, expect,it } from 'vitest';

import { Constraint } from '../../../components/structural/Constraint';
import { Prompt } from '../../../components/structural/Prompt';
import { Role } from '../../../components/structural/Role';
import { Task } from '../../../components/structural/Task';
import { createPromptFromSource } from '../../../src/create-prompt';
import { jsx } from '../../../src/jsx-runtime';
import { render } from '../../../src/render';

describe('Prompt defaults e2e', () => {
  it('should render with auto-generated defaults through pipeline', async () => {
    const source = `
<Prompt name="defaults-test">
  <Task>Summarize this document</Task>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'defaults.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    // Should contain auto-generated role
    expect(result.text).toContain('Assistant');
    expect(result.text).toContain('Summarize this document');
    // Should contain auto-generated constraints
    expect(result.text).toContain('concise');
    expect(result.text).toMatchSnapshot();
  });

  it('should render bare mode through pipeline', async () => {
    const source = `
<Prompt name="bare-test" bare>
  <Task>Summarize this document</Task>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'bare.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    // Bare mode should not generate defaults
    expect(result.text).not.toContain('Assistant');
    expect(result.text).not.toContain('concise');
    expect(result.text).toContain('Summarize this document');
    expect(result.text).toMatchSnapshot();
  });

  it('should render role shorthand through pipeline', async () => {
    const source = `
<Prompt name="shorthand" role="engineer">
  <Task>Review code</Task>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'shorthand.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('Software Engineer');
    expect(result.text).toMatchSnapshot();
  });

  it('should render role shorthand with expertise through pipeline', async () => {
    const source = `
<Prompt name="shorthand-expertise" role="engineer" expertise="TypeScript">
  <Task>Review code</Task>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'shorthand-expertise.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('Software Engineer');
    expect(result.text).toContain('TypeScript');
    expect(result.text).toMatchSnapshot();
  });

  it('should skip default role when Role child is provided through pipeline', async () => {
    const source = `
<Prompt name="custom-role">
  <Role>You are a custom specialist.</Role>
  <Task>Do something</Task>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'custom-role.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('custom specialist');
    // Only one role section
    const roleTagCount = (result.text.match(/<role>/g) || []).length;
    expect(roleTagCount).toBe(1);
  });

  it('should skip default constraints when Constraint child is provided through pipeline', async () => {
    const source = `
<Prompt name="custom-constraints">
  <Task>Do something</Task>
  <Constraint type="must">My custom constraint</Constraint>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'custom-constraints.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('My custom constraint');
    expect(result.text).not.toContain('concise');
  });

  describe('snapshots', () => {
    it('should match snapshot: minimal prompt with defaults', async () => {
      const element = jsx(Prompt, {
        name: 'snapshot-minimal',
        children: jsx(Task, { children: 'Do the thing' }),
      });
      const result = await render(element);
      expect(result.text).toMatchSnapshot();
    });

    it('should match snapshot: bare mode', async () => {
      const element = jsx(Prompt, {
        name: 'snapshot-bare',
        bare: true,
        children: jsx(Task, { children: 'Do the thing' }),
      });
      const result = await render(element);
      expect(result.text).toMatchSnapshot();
    });

    it('should match snapshot: engineer role shorthand', async () => {
      const element = jsx(Prompt, {
        name: 'snapshot-engineer',
        role: 'engineer',
        children: jsx(Task, { children: 'Review code' }),
      });
      const result = await render(element);
      expect(result.text).toMatchSnapshot();
    });

    it('should match snapshot: engineer with expertise', async () => {
      const element = jsx(Prompt, {
        name: 'snapshot-engineer-expertise',
        role: 'engineer',
        expertise: 'TypeScript, React',
        children: jsx(Task, { children: 'Review code' }),
      });
      const result = await render(element);
      expect(result.text).toMatchSnapshot();
    });

    it('should match snapshot: custom role child overrides default', async () => {
      const element = jsx(Prompt, {
        name: 'snapshot-custom-role',
        children: [
          jsx(Role, { children: 'You are an expert in everything' }),
          jsx(Task, { children: 'Do something' }),
        ],
      });
      const result = await render(element);
      expect(result.text).toMatchSnapshot();
    });

    it('should match snapshot: custom constraint child overrides default', async () => {
      const element = jsx(Prompt, {
        name: 'snapshot-custom-constraint',
        children: [
          jsx(Task, { children: 'Do something' }),
          jsx(Constraint, { type: 'must', children: 'Be awesome' }),
        ],
      });
      const result = await render(element);
      expect(result.text).toMatchSnapshot();
    });

    it('should match snapshot: defaults object with role disabled', async () => {
      const element = jsx(Prompt, {
        name: 'snapshot-no-role',
        defaults: { role: false },
        children: jsx(Task, { children: 'Do something' }),
      });
      const result = await render(element);
      expect(result.text).toMatchSnapshot();
    });
  });
});
