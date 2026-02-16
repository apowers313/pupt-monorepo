import { describe, expect,it } from 'vitest';

import { Reference } from '../../../../components/structural/Reference';
import { jsx } from '../../../../src/jsx-runtime';
import { render } from '../../../../src/render';

describe('Reference', () => {
  it('should render title', async () => {
    const element = jsx(Reference, { title: 'API Docs' });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('API Docs');
  });

  it('should render title with URL', async () => {
    const element = jsx(Reference, {
      title: 'API Docs',
      url: 'https://api.example.com/docs',
    });
    const result = await render(element);
    expect(result.text).toContain('API Docs');
    expect(result.text).toContain('https://api.example.com/docs');
  });

  it('should render title with description', async () => {
    const element = jsx(Reference, {
      title: 'Internal Wiki',
      description: 'Team conventions and guidelines',
    });
    const result = await render(element);
    expect(result.text).toContain('Internal Wiki');
    expect(result.text).toContain('Team conventions and guidelines');
  });

  it('should render all props together', async () => {
    const element = jsx(Reference, {
      title: 'Style Guide',
      url: 'https://example.com/style',
      description: 'Company writing style guide',
    });
    const result = await render(element);
    expect(result.text).toContain('Style Guide');
    expect(result.text).toContain('https://example.com/style');
    expect(result.text).toContain('Company writing style guide');
  });

  it('should render children alongside props', async () => {
    const element = jsx(Reference, {
      title: 'API Docs',
      children: 'Additional notes about the API',
    });
    const result = await render(element);
    expect(result.text).toContain('API Docs');
    expect(result.text).toContain('Additional notes about the API');
  });

  it('should wrap in XML tags by default', async () => {
    const element = jsx(Reference, { title: 'Test' });
    const result = await render(element);
    expect(result.text).toContain('<reference>');
    expect(result.text).toContain('</reference>');
  });

  it('should support markdown delimiter', async () => {
    const element = jsx(Reference, {
      title: 'Test',
      delimiter: 'markdown',
    });
    const result = await render(element);
    expect(result.text).toContain('## reference');
    expect(result.text).not.toContain('<reference>');
  });

  it('should support none delimiter', async () => {
    const element = jsx(Reference, {
      title: 'Test',
      delimiter: 'none',
    });
    const result = await render(element);
    expect(result.text).not.toContain('<reference>');
    expect(result.text).not.toContain('## reference');
    expect(result.text).toContain('Test');
  });
});
