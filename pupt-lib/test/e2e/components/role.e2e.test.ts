import { describe, expect,it } from 'vitest';

import { Role } from '../../../components/structural/Role';
import { createPromptFromSource } from '../../../src/create-prompt';
import { jsx } from '../../../src/jsx-runtime';
import { render } from '../../../src/render';

describe('Role e2e', () => {
  it('should render through full .prompt pipeline with defaults', async () => {
    const source = `
<Prompt name="role-test" bare>
  <Role>You are a helpful coding assistant.</Role>
  <Task>Help me write code.</Task>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'role-test.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('helpful coding assistant');
    expect(result.text).toContain('Help me write code');
  });

  it('should not auto-append expertise when children provided through .prompt pipeline', async () => {
    const source = `
<Prompt name="role-expertise" bare>
  <Role expertise="TypeScript">Software Engineer</Role>
  <Task>Review code.</Task>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'role-expertise.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('Software Engineer');
    expect(result.text).not.toContain('with expertise in');
  });

  it('should not auto-append domain when children provided through .prompt pipeline', async () => {
    const source = `
<Prompt name="role-domain" bare>
  <Role domain="healthcare">Analyst</Role>
  <Task>Analyze data.</Task>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'role-domain.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('Analyst');
    expect(result.text).not.toContain('specializing in the healthcare domain');
  });

  it('should render preset through .prompt pipeline', async () => {
    const source = `
<Prompt name="role-preset" bare>
  <Role preset="engineer" />
  <Task>Review this code.</Task>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'role-preset.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('Software Engineer');
  });

  it('should render preset with provider adaptation', async () => {
    const source = `
<Prompt name="role-provider" bare>
  <Role preset="engineer" />
  <Task>Review code.</Task>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'role-provider.prompt');
    const result = await render(element, { env: { llm: { provider: 'anthropic' } } });
    expect(result.ok).toBe(true);
    expect(result.text).toContain('You are');
  });

  describe('snapshots', () => {
    it('should match snapshot: expertise with xml delimiter', async () => {
      const element = jsx(Role, { expertise: 'TypeScript', children: 'Software Engineer' });
      const result = await render(element);
      expect(result.text).toMatchSnapshot();
    });

    it('should match snapshot: domain with xml delimiter', async () => {
      const element = jsx(Role, { domain: 'healthcare', children: 'Analyst' });
      const result = await render(element);
      expect(result.text).toMatchSnapshot();
    });

    it('should match snapshot: both expertise and domain', async () => {
      const element = jsx(Role, {
        expertise: 'data analysis',
        domain: 'finance',
        children: 'You are an expert analyst',
      });
      const result = await render(element);
      expect(result.text).toMatchSnapshot();
    });

    it('should match snapshot: expertise with markdown delimiter', async () => {
      const element = jsx(Role, {
        expertise: 'TypeScript',
        delimiter: 'markdown',
        children: 'Software Engineer',
      });
      const result = await render(element);
      expect(result.text).toMatchSnapshot();
    });

    it('should match snapshot: expertise with none delimiter', async () => {
      const element = jsx(Role, {
        expertise: 'TypeScript',
        delimiter: 'none',
        children: 'Software Engineer',
      });
      const result = await render(element);
      expect(result.text).toMatchSnapshot();
    });

    it('should match snapshot: preset engineer', async () => {
      const element = jsx(Role, { preset: 'engineer' });
      const result = await render(element);
      expect(result.text).toMatchSnapshot();
    });

    it('should match snapshot: preset with experience and traits', async () => {
      const element = jsx(Role, {
        preset: 'engineer',
        experience: 'senior',
        traits: ['detail-oriented', 'pragmatic'],
      });
      const result = await render(element);
      expect(result.text).toMatchSnapshot();
    });
  });
});
