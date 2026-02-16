import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/render';
import { jsx, jsxs } from '../../../../src/jsx-runtime';
import { References } from '../../../../components/structural/References';
import { Reference } from '../../../../components/structural/Reference';

describe('References', () => {
  it('should render Reference children', async () => {
    const element = jsxs(References, {
      children: [
        jsx(Reference, { title: 'API Docs', url: 'https://api.example.com' }),
        jsx(Reference, { title: 'Wiki', description: 'Internal docs' }),
      ],
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('API Docs');
    expect(result.text).toContain('https://api.example.com');
    expect(result.text).toContain('Wiki');
    expect(result.text).toContain('Internal docs');
  });

  it('should render sources array', async () => {
    const element = jsx(References, {
      sources: [
        { title: 'API Docs', url: 'https://api.example.com/docs' },
        { title: 'Wiki', description: 'Internal documentation' },
      ],
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('API Docs');
    expect(result.text).toContain('https://api.example.com/docs');
    expect(result.text).toContain('Wiki');
    expect(result.text).toContain('Internal documentation');
  });

  it('should combine sources and children', async () => {
    const element = jsx(References, {
      sources: [{ title: 'External Docs', url: 'https://example.com' }],
      children: jsx(Reference, { title: 'Internal Wiki', description: 'Team conventions' }),
    });
    const result = await render(element);
    expect(result.text).toContain('External Docs');
    expect(result.text).toContain('https://example.com');
    expect(result.text).toContain('Internal Wiki');
    expect(result.text).toContain('Team conventions');
  });

  it('should support bibliography style', async () => {
    const element = jsx(References, {
      style: 'bibliography',
      sources: [
        { title: 'API Reference', url: 'https://api.example.com', description: 'Official API docs' },
      ],
    });
    const result = await render(element);
    expect(result.text).toContain('- API Reference');
  });

  it('should support footnote style', async () => {
    const element = jsx(References, {
      style: 'footnote',
      sources: [
        { title: 'API Reference', url: 'https://api.example.com' },
      ],
    });
    const result = await render(element);
    expect(result.text).toContain('[API Reference]');
    expect(result.text).toContain('https://api.example.com');
  });

  it('should use inline style by default', async () => {
    const element = jsx(References, {
      sources: [
        { title: 'Test Doc', url: 'https://test.com', description: 'A test document' },
      ],
    });
    const result = await render(element);
    expect(result.text).toContain('Test Doc');
    expect(result.text).toContain('URL: https://test.com');
    expect(result.text).toContain('A test document');
  });

  it('should wrap in XML tags by default', async () => {
    const element = jsx(References, {
      children: jsx(Reference, { title: 'Test' }),
    });
    const result = await render(element);
    expect(result.text).toContain('<references>');
    expect(result.text).toContain('</references>');
  });

  it('should support markdown delimiter', async () => {
    const element = jsx(References, {
      delimiter: 'markdown',
      children: jsx(Reference, { title: 'Test' }),
    });
    const result = await render(element);
    expect(result.text).toContain('## references');
    expect(result.text).not.toContain('<references>');
  });

  it('should support none delimiter', async () => {
    const element = jsx(References, {
      delimiter: 'none',
      children: jsx(Reference, { title: 'Test' }),
    });
    const result = await render(element);
    expect(result.text).not.toContain('<references>');
    expect(result.text).not.toContain('## references');
  });

  it('should return empty string when no children and no sources', async () => {
    const element = jsx(References, {});
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toBe('');
  });

  it('should accept extend prop', async () => {
    const element = jsx(References, {
      extend: true,
      children: jsx(Reference, { title: 'Custom' }),
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('Custom');
  });
});
