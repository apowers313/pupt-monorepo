import { describe, expect,it } from 'vitest';

import { Constraint } from '../../../../components/structural/Constraint';
import { Constraints } from '../../../../components/structural/Constraints';
import { jsx, jsxs } from '../../../../src/jsx-runtime';
import { render } from '../../../../src/render';

describe('Constraints container', () => {
  it('should render children constraints', async () => {
    const element = jsxs(Constraints, {
      children: [
        jsx(Constraint, { type: 'must', children: 'Be accurate' }),
        jsx(Constraint, { type: 'should', children: 'Be concise' }),
      ],
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('MUST:');
    expect(result.text).toContain('Be accurate');
    expect(result.text).toContain('SHOULD:');
    expect(result.text).toContain('Be concise');
  });

  it('should render preset constraints', async () => {
    const element = jsx(Constraints, {
      presets: ['be-concise', 'cite-sources'],
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('concise');
    expect(result.text).toContain('sources');
  });

  it('should render both children and presets', async () => {
    const element = jsxs(Constraints, {
      presets: ['be-concise'],
      children: [
        jsx(Constraint, { type: 'must', children: 'Custom constraint' }),
      ],
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('Custom constraint');
    expect(result.text).toContain('concise');
  });

  it('should wrap in constraints XML tag by default', async () => {
    const element = jsx(Constraints, {
      children: jsx(Constraint, { type: 'must', children: 'Be accurate' }),
    });
    const result = await render(element);
    expect(result.text).toContain('<constraints>');
    expect(result.text).toContain('</constraints>');
  });

  it('should support markdown delimiter', async () => {
    const element = jsx(Constraints, {
      delimiter: 'markdown',
      children: jsx(Constraint, { type: 'must', children: 'Be accurate' }),
    });
    const result = await render(element);
    expect(result.text).toContain('## constraints');
    expect(result.text).not.toContain('<constraints>');
  });

  it('should render empty string when no children and no presets', async () => {
    const element = jsx(Constraints, {});
    const result = await render(element);
    expect(result.ok).toBe(true);
  });

  it('should ignore unknown presets', async () => {
    const element = jsx(Constraints, {
      presets: ['nonexistent-preset'],
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
  });

  it('should accept extend prop without error', async () => {
    const element = jsx(Constraints, {
      extend: true,
      children: jsx(Constraint, { type: 'must', children: 'Custom' }),
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('Custom');
  });

  it('should accept exclude prop without error', async () => {
    const element = jsx(Constraints, {
      exclude: ['concise'],
      children: jsx(Constraint, { type: 'must', children: 'Custom' }),
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('Custom');
  });
});
