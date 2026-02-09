import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/render';
import { jsx, jsxs } from '../../../../src/jsx-runtime';
import { Contexts } from '../../../../components/structural/Contexts';
import { Context } from '../../../../components/structural/Context';

describe('Contexts container', () => {
  it('should render children contexts', async () => {
    const element = jsxs(Contexts, {
      children: [
        jsx(Context, { label: 'Background', children: 'Some background info' }),
        jsx(Context, { label: 'Domain', children: 'Domain knowledge' }),
      ],
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('Background');
    expect(result.text).toContain('Some background info');
    expect(result.text).toContain('Domain');
    expect(result.text).toContain('Domain knowledge');
  });

  it('should wrap in contexts XML tag by default', async () => {
    const element = jsx(Contexts, {
      children: jsx(Context, { children: 'Some context' }),
    });
    const result = await render(element);
    expect(result.text).toContain('<contexts>');
    expect(result.text).toContain('</contexts>');
  });

  it('should support markdown delimiter', async () => {
    const element = jsx(Contexts, {
      delimiter: 'markdown',
      children: jsx(Context, { children: 'Some context' }),
    });
    const result = await render(element);
    expect(result.text).toContain('## contexts');
    expect(result.text).not.toContain('<contexts>');
  });

  it('should render empty when no children', async () => {
    const element = jsx(Contexts, {});
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toBe('');
  });

  it('should accept extend prop', async () => {
    const element = jsx(Contexts, {
      extend: true,
      children: jsx(Context, { children: 'Extended context' }),
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('Extended context');
  });
});
