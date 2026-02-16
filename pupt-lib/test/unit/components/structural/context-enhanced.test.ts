import { describe, expect,it } from 'vitest';

import { Context } from '../../../../components/structural/Context';
import { jsx } from '../../../../src/jsx-runtime';
import { render } from '../../../../src/render';

describe('Context enhanced props', () => {
  it('should render label', async () => {
    const element = jsx(Context, {
      label: 'User Requirements',
      children: 'Build a REST API',
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('[User Requirements]');
    expect(result.text).toContain('Build a REST API');
  });

  it('should render source attribution', async () => {
    const element = jsx(Context, {
      source: 'API Documentation v2.3',
      children: 'The /users endpoint accepts GET, POST methods.',
    });
    const result = await render(element);
    expect(result.text).toContain('Source: API Documentation v2.3');
  });

  it('should render relevance hint', async () => {
    const element = jsx(Context, {
      relevance: 'affects architectural decisions',
      children: 'HIPAA-compliant application',
    });
    const result = await render(element);
    expect(result.text).toContain('Relevant because: affects architectural decisions');
  });

  it('should render label, source, and relevance together', async () => {
    const element = jsx(Context, {
      label: 'Compliance',
      source: 'Legal dept',
      relevance: 'must comply with regulations',
      children: 'GDPR requirements apply',
    });
    const result = await render(element);
    expect(result.text).toContain('[Compliance]');
    expect(result.text).toContain('Source: Legal dept');
    expect(result.text).toContain('Relevant because');
    expect(result.text).toContain('GDPR');
  });

  it('should accept type prop', async () => {
    const element = jsx(Context, {
      type: 'reference',
      children: 'Some reference data',
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('Some reference data');
  });

  it('should accept priority prop', async () => {
    const element = jsx(Context, {
      priority: 'critical',
      children: 'Important context',
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('Important context');
  });

  it('should render just children without enhanced props', async () => {
    const element = jsx(Context, { children: 'Plain context' });
    const result = await render(element);
    expect(result.text).toContain('Plain context');
  });
});
