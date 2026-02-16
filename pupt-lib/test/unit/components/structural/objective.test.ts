import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/render';
import { jsx } from '../../../../src/jsx-runtime';
import { Objective } from '../../../../components/structural/Objective';

describe('Objective', () => {
  it('should render primary goal', async () => {
    const element = jsx(Objective, { primary: 'Build a REST API' });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('Build a REST API');
  });

  it('should render with XML delimiters by default', async () => {
    const element = jsx(Objective, { primary: 'Build a REST API' });
    const result = await render(element);
    expect(result.text).toContain('<objective>');
    expect(result.text).toContain('</objective>');
  });

  it('should render secondary goals', async () => {
    const element = jsx(Objective, {
      primary: 'Build a REST API',
      secondary: ['Handle authentication', 'Support pagination'],
    });
    const result = await render(element);
    expect(result.text).toContain('Handle authentication');
    expect(result.text).toContain('Support pagination');
  });

  it('should render success metrics', async () => {
    const element = jsx(Objective, {
      primary: 'Build a REST API',
      metrics: ['< 200ms response time', '99.9% uptime'],
    });
    const result = await render(element);
    expect(result.text).toContain('< 200ms response time');
    expect(result.text).toContain('99.9% uptime');
  });

  it('should render all props together', async () => {
    const element = jsx(Objective, {
      primary: 'Build a REST API',
      secondary: ['Handle authentication'],
      metrics: ['< 200ms response time'],
    });
    const result = await render(element);
    expect(result.text).toContain('Build a REST API');
    expect(result.text).toContain('Handle authentication');
    expect(result.text).toContain('< 200ms response time');
  });

  it('should support markdown delimiter', async () => {
    const element = jsx(Objective, {
      primary: 'Build a REST API',
      delimiter: 'markdown',
    });
    const result = await render(element);
    expect(result.text).toContain('## objective');
    expect(result.text).not.toContain('<objective>');
  });

  it('should support none delimiter', async () => {
    const element = jsx(Objective, {
      primary: 'Build a REST API',
      delimiter: 'none',
    });
    const result = await render(element);
    expect(result.text).not.toContain('<objective>');
    expect(result.text).not.toContain('## objective');
    expect(result.text).toContain('Build a REST API');
  });

  it('should render custom children', async () => {
    const element = jsx(Objective, {
      primary: 'ignored when children provided',
      children: 'Custom objective content',
    });
    const result = await render(element);
    expect(result.text).toContain('Custom objective content');
  });

  it('should not render secondary section when empty', async () => {
    const element = jsx(Objective, { primary: 'Build a REST API' });
    const result = await render(element);
    expect(result.text).not.toContain('Secondary');
  });

  it('should not render metrics section when empty', async () => {
    const element = jsx(Objective, { primary: 'Build a REST API' });
    const result = await render(element);
    expect(result.text).not.toContain('metrics');
  });
});
