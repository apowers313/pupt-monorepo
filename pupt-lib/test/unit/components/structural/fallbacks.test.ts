import { describe, expect,it } from 'vitest';

import { FALLBACK_PRESETS } from '../../../../components/presets/guardrail-presets';
import { Fallback } from '../../../../components/structural/Fallback';
import { Fallbacks } from '../../../../components/structural/Fallbacks';
import { jsx, jsxs } from '../../../../src/jsx-runtime';
import { render } from '../../../../src/render';

describe('Fallbacks', () => {
  it('should render Fallback children', async () => {
    const element = jsxs(Fallbacks, {
      children: [
        jsx(Fallback, { when: 'unable to complete', then: 'explain why' }),
        jsx(Fallback, { when: 'missing info', then: 'ask questions' }),
      ],
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('unable to complete');
    expect(result.text).toContain('explain why');
    expect(result.text).toContain('missing info');
    expect(result.text).toContain('ask questions');
  });

  it('should render standard preset', async () => {
    const element = jsx(Fallbacks, { preset: 'standard' });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('unable to complete the request');
    expect(result.text).toContain('missing required information');
    expect(result.text).toContain('encountering an error');
  });

  it('should combine preset with children', async () => {
    const element = jsx(Fallbacks, {
      preset: 'standard',
      children: jsx(Fallback, { when: 'timeout', then: 'retry' }),
    });
    const result = await render(element);
    expect(result.text).toContain('unable to complete the request');
    expect(result.text).toContain('timeout');
    expect(result.text).toContain('retry');
  });

  it('should wrap in XML tags by default', async () => {
    const element = jsx(Fallbacks, {
      children: jsx(Fallback, { when: 'test', then: 'action' }),
    });
    const result = await render(element);
    expect(result.text).toContain('<fallbacks>');
    expect(result.text).toContain('</fallbacks>');
  });

  it('should support markdown delimiter', async () => {
    const element = jsx(Fallbacks, {
      delimiter: 'markdown',
      children: jsx(Fallback, { when: 'test', then: 'action' }),
    });
    const result = await render(element);
    expect(result.text).toContain('## fallbacks');
    expect(result.text).not.toContain('<fallbacks>');
  });

  it('should support none delimiter', async () => {
    const element = jsx(Fallbacks, {
      delimiter: 'none',
      children: jsx(Fallback, { when: 'test', then: 'action' }),
    });
    const result = await render(element);
    expect(result.text).not.toContain('<fallbacks>');
    expect(result.text).not.toContain('## fallbacks');
  });

  it('should return empty string when no children and no preset', async () => {
    const element = jsx(Fallbacks, {});
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toBe('');
  });

  it('should accept extend prop', async () => {
    const element = jsx(Fallbacks, {
      extend: true,
      children: jsx(Fallback, { when: 'custom', then: 'handle it' }),
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('custom');
  });

  it('should export FALLBACK_PRESETS constant', () => {
    expect(FALLBACK_PRESETS).toBeDefined();
    expect(FALLBACK_PRESETS.standard).toBeDefined();
    expect(FALLBACK_PRESETS.standard.length).toBeGreaterThan(0);
  });
});
