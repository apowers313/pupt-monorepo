import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/render';
import { jsx } from '../../../../src/jsx-runtime';
import { Role } from '../../../../components/structural/Role';

describe('Role', () => {
  it('should render role section', async () => {
    const element = jsx(Role, {
      children: 'You are a helpful assistant.',
    });

    const result = await render(element);
    expect(result.text).toContain('You are a helpful assistant.');
  });

  it('should render with XML delimiters by default', async () => {
    const element = jsx(Role, {
      children: 'Assistant role',
    });

    const result = await render(element);
    expect(result.text).toMatch(/<role>[\s\S]*Assistant role[\s\S]*<\/role>/);
  });

  it('should render expertise when provided', async () => {
    const element = jsx(Role, {
      expertise: 'TypeScript',
      children: 'Software Engineer',
    });

    const result = await render(element);
    expect(result.text).toContain('TypeScript');
    expect(result.text).toContain('Software Engineer');
  });

  it('should render domain when provided', async () => {
    const element = jsx(Role, {
      domain: 'healthcare',
      children: 'Analyst',
    });

    const result = await render(element);
    expect(result.text).toContain('healthcare');
  });

  it('should render both expertise and domain together', async () => {
    const element = jsx(Role, {
      expertise: 'data analysis',
      domain: 'finance',
      children: 'You are an expert analyst',
    });

    const result = await render(element);
    expect(result.text).toContain('data analysis');
    expect(result.text).toContain('finance');
  });

  it('should support markdown delimiter', async () => {
    const element = jsx(Role, {
      delimiter: 'markdown',
      children: 'A markdown role',
    });

    const result = await render(element);
    expect(result.text).toContain('## role');
    expect(result.text).toContain('A markdown role');
  });

  it('should support no delimiter', async () => {
    const element = jsx(Role, {
      delimiter: 'none',
      children: 'A plain role',
    });

    const result = await render(element);
    expect(result.text).not.toContain('<role>');
    expect(result.text).not.toContain('## role');
    expect(result.text).toContain('A plain role');
  });
});
