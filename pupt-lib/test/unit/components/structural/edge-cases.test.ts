import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/render';
import { jsx, jsxs } from '../../../../src/jsx-runtime';
import { EdgeCases } from '../../../../components/structural/EdgeCases';
import { EDGE_CASE_PRESETS } from '../../../../components/presets/guardrail-presets';
import { When } from '../../../../components/structural/When';

describe('EdgeCases', () => {
  it('should render When children', async () => {
    const element = jsxs(EdgeCases, {
      children: [
        jsx(When, { condition: 'input is empty', children: 'Ask for input' }),
        jsx(When, { condition: 'data is ambiguous', children: 'Ask for clarification' }),
      ],
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('input is empty');
    expect(result.text).toContain('Ask for input');
    expect(result.text).toContain('data is ambiguous');
    expect(result.text).toContain('Ask for clarification');
  });

  it('should render standard preset', async () => {
    const element = jsx(EdgeCases, { preset: 'standard' });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('missing required data');
    expect(result.text).toContain('outside your expertise');
    expect(result.text).toContain('multiple valid interpretations');
  });

  it('should render minimal preset', async () => {
    const element = jsx(EdgeCases, { preset: 'minimal' });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('input is unclear');
  });

  it('should combine preset with children', async () => {
    const element = jsx(EdgeCases, {
      preset: 'minimal',
      children: jsx(When, { condition: 'timeout occurs', children: 'Retry the operation' }),
    });
    const result = await render(element);
    expect(result.text).toContain('input is unclear');
    expect(result.text).toContain('timeout occurs');
    expect(result.text).toContain('Retry the operation');
  });

  it('should wrap in XML tags by default', async () => {
    const element = jsx(EdgeCases, {
      children: jsx(When, { condition: 'test', children: 'action' }),
    });
    const result = await render(element);
    expect(result.text).toContain('<edge-cases>');
    expect(result.text).toContain('</edge-cases>');
  });

  it('should support markdown delimiter', async () => {
    const element = jsx(EdgeCases, {
      delimiter: 'markdown',
      children: jsx(When, { condition: 'test', children: 'action' }),
    });
    const result = await render(element);
    expect(result.text).toContain('## edge-cases');
    expect(result.text).not.toContain('<edge-cases>');
  });

  it('should support none delimiter', async () => {
    const element = jsx(EdgeCases, {
      delimiter: 'none',
      children: jsx(When, { condition: 'test', children: 'action' }),
    });
    const result = await render(element);
    expect(result.text).not.toContain('<edge-cases>');
    expect(result.text).not.toContain('## edge-cases');
  });

  it('should return empty string when no children and no preset', async () => {
    const element = jsx(EdgeCases, {});
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toBe('');
  });

  it('should accept extend prop', async () => {
    const element = jsx(EdgeCases, {
      extend: true,
      children: jsx(When, { condition: 'custom edge case', children: 'handle it' }),
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('custom edge case');
  });

  it('should export EDGE_CASE_PRESETS constant', () => {
    expect(EDGE_CASE_PRESETS).toBeDefined();
    expect(EDGE_CASE_PRESETS.standard).toBeDefined();
    expect(EDGE_CASE_PRESETS.minimal).toBeDefined();
    expect(EDGE_CASE_PRESETS.standard.length).toBeGreaterThan(0);
  });
});
