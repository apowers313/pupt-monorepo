import { describe, expect,it } from 'vitest';

import { Role } from '../../../../components/structural/Role';
import { Specialization } from '../../../../components/structural/Specialization';
import { jsx } from '../../../../src/jsx-runtime';
import { render } from '../../../../src/render';

describe('Role: children should not have auto-appended expertise/domain fragments', () => {
  it('should not append "with expertise in..." when children are provided', async () => {
    const element = jsx(Role, {
      expertise: ['TypeScript', 'React'],
      children: 'You are a senior engineer.',
    });

    const result = await render(element);
    expect(result.text).toContain('You are a senior engineer.');
    expect(result.text).not.toContain('with expertise in');
  });

  it('should not append "specializing in the ... domain" when children are provided', async () => {
    const element = jsx(Role, {
      domain: 'healthcare',
      children: 'You are a medical data analyst.',
    });

    const result = await render(element);
    expect(result.text).toContain('You are a medical data analyst.');
    expect(result.text).not.toContain('specializing in the healthcare domain');
  });

  it('should not append either fragment when both expertise and domain are provided with children', async () => {
    const element = jsx(Role, {
      expertise: 'data analysis',
      domain: 'finance',
      children: 'You are an expert analyst.',
    });

    const result = await render(element);
    expect(result.text).toContain('You are an expert analyst.');
    expect(result.text).not.toContain('with expertise in');
    expect(result.text).not.toContain('specializing in the');
  });

  it('should not append expertise fragment when Specialization child is present (issue #37)', async () => {
    const element = jsx(Role, {
      title: 'Senior Code Reviewer',
      experience: 'principal',
      expertise: ['code review methodology', 'software quality assurance', 'security vulnerability analysis'],
      traits: ['thorough', 'constructive', 'precise'],
      style: 'professional',
      children: [
        jsx(Specialization, {
          areas: ['systematic code analysis', 'defect classification', 'security auditing'],
          level: 'authority',
        }),
        '\nYou approach code review as a collaborative improvement process, not a gate-keeping exercise.',
      ],
    });

    const result = await render(element);
    expect(result.text).toContain('systematic code analysis');
    expect(result.text).toContain('You approach code review as a collaborative improvement process');
    expect(result.text).not.toContain('with expertise in code review methodology');
    expect(result.text).not.toContain('specializing in the');
  });

  it('should still render expertise in preset path (no children)', async () => {
    const element = jsx(Role, {
      preset: 'engineer',
      expertise: ['TypeScript', 'React'],
    });

    const result = await render(element);
    expect(result.text).toContain('with expertise in');
    expect(result.text).toContain('TypeScript');
    expect(result.text).toContain('React');
  });

  it('should still render domain in preset path (no children)', async () => {
    const element = jsx(Role, {
      preset: 'consultant',
      domain: 'healthcare',
    });

    const result = await render(element);
    expect(result.text).toContain('healthcare');
  });
});
