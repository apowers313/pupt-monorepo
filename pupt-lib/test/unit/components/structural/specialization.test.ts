import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/render';
import { jsx } from '../../../../src/jsx-runtime';
import { Specialization } from '../../../../components/structural/Specialization';

describe('Specialization', () => {
  it('should render single area', async () => {
    const element = jsx(Specialization, { areas: 'TypeScript' });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('TypeScript');
  });

  it('should render with XML delimiters by default', async () => {
    const element = jsx(Specialization, { areas: 'TypeScript' });
    const result = await render(element);
    expect(result.text).toContain('<specialization>');
    expect(result.text).toContain('</specialization>');
  });

  it('should render multiple areas', async () => {
    const element = jsx(Specialization, {
      areas: ['TypeScript', 'React', 'Node.js'],
    });
    const result = await render(element);
    expect(result.text).toContain('TypeScript');
    expect(result.text).toContain('React');
    expect(result.text).toContain('Node.js');
  });

  it('should render expertise level', async () => {
    const element = jsx(Specialization, {
      areas: 'TypeScript',
      level: 'expert',
    });
    const result = await render(element);
    expect(result.text).toContain('expert');
  });

  it('should render areas with level', async () => {
    const element = jsx(Specialization, {
      areas: ['TypeScript', 'React'],
      level: 'proficient',
    });
    const result = await render(element);
    expect(result.text).toContain('TypeScript');
    expect(result.text).toContain('React');
    expect(result.text).toContain('proficient');
  });

  it('should support markdown delimiter', async () => {
    const element = jsx(Specialization, {
      areas: 'TypeScript',
      delimiter: 'markdown',
    });
    const result = await render(element);
    expect(result.text).toContain('## specialization');
    expect(result.text).not.toContain('<specialization>');
  });

  it('should support none delimiter', async () => {
    const element = jsx(Specialization, {
      areas: 'TypeScript',
      delimiter: 'none',
    });
    const result = await render(element);
    expect(result.text).not.toContain('<specialization>');
    expect(result.text).not.toContain('## specialization');
    expect(result.text).toContain('TypeScript');
  });

  it('should render custom children', async () => {
    const element = jsx(Specialization, {
      areas: 'ignored',
      children: 'Deep expertise in distributed systems',
    });
    const result = await render(element);
    expect(result.text).toContain('Deep expertise in distributed systems');
  });

  it('should render all level options', async () => {
    const levels = ['familiar', 'proficient', 'expert', 'authority'] as const;
    for (const level of levels) {
      const element = jsx(Specialization, { areas: 'TypeScript', level });
      const result = await render(element);
      expect(result.ok).toBe(true);
      expect(result.text).toContain(level);
    }
  });
});
