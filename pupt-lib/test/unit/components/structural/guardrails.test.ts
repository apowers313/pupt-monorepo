import { describe, expect,it } from 'vitest';

import { STANDARD_GUARDRAILS } from '../../../../components/presets/guardrail-presets';
import { Guardrails } from '../../../../components/structural/Guardrails';
import { jsx } from '../../../../src/jsx-runtime';
import { render } from '../../../../src/render';

describe('Guardrails', () => {
  it('should render standard preset by default', async () => {
    const element = jsx(Guardrails, {});
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('harmful');
    expect(result.text).toContain('system prompts');
  });

  it('should render standard preset explicitly', async () => {
    const element = jsx(Guardrails, { preset: 'standard' });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('harmful');
    expect(result.text).toContain('system prompts');
    expect(result.text).toContain('impersonate');
    expect(result.text).toContain('uncertainty');
  });

  it('should render strict preset', async () => {
    const element = jsx(Guardrails, { preset: 'strict' });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('harmful');
    expect(result.text).toContain('deception');
    expect(result.text).toContain('dangerous activities');
    expect(result.text).toContain('ethical guidelines');
  });

  it('should render minimal preset', async () => {
    const element = jsx(Guardrails, { preset: 'minimal' });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('harmful');
    expect(result.text).toContain('uncertainty');
  });

  it('should add custom prohibitions', async () => {
    const element = jsx(Guardrails, {
      preset: 'standard',
      prohibit: ['Discuss competitors'],
    });
    const result = await render(element);
    expect(result.text).toContain('Discuss competitors');
    expect(result.text).toContain('Prohibited actions');
    expect(result.text).toContain('Do not: Discuss competitors');
  });

  it('should add multiple prohibitions', async () => {
    const element = jsx(Guardrails, {
      prohibit: ['Discuss competitors', 'Share pricing details'],
    });
    const result = await render(element);
    expect(result.text).toContain('Do not: Discuss competitors');
    expect(result.text).toContain('Do not: Share pricing details');
  });

  it('should support extend to add required behaviors', async () => {
    const element = jsx(Guardrails, {
      extend: true,
      require: ['Always cite sources'],
    });
    const result = await render(element);
    expect(result.text).toContain('Always cite sources');
  });

  it('should support exclude to remove guardrails', async () => {
    const element = jsx(Guardrails, {
      preset: 'standard',
      exclude: ['impersonate'],
    });
    const result = await render(element);
    expect(result.text).toContain('harmful');
    expect(result.text).not.toContain('impersonate');
  });

  it('should combine require and prohibit', async () => {
    const element = jsx(Guardrails, {
      require: ['Always be helpful'],
      prohibit: ['Share personal data'],
    });
    const result = await render(element);
    expect(result.text).toContain('Always be helpful');
    expect(result.text).toContain('Do not: Share personal data');
  });

  it('should wrap in XML tags by default', async () => {
    const element = jsx(Guardrails, {});
    const result = await render(element);
    expect(result.text).toContain('<guardrails>');
    expect(result.text).toContain('</guardrails>');
  });

  it('should support markdown delimiter', async () => {
    const element = jsx(Guardrails, { delimiter: 'markdown' });
    const result = await render(element);
    expect(result.text).toContain('## guardrails');
    expect(result.text).not.toContain('<guardrails>');
  });

  it('should support none delimiter', async () => {
    const element = jsx(Guardrails, { delimiter: 'none' });
    const result = await render(element);
    expect(result.text).not.toContain('<guardrails>');
    expect(result.text).not.toContain('## guardrails');
    expect(result.text).toContain('harmful');
  });

  it('should render children alongside preset', async () => {
    const element = jsx(Guardrails, {
      children: 'Additional safety notes here.',
    });
    const result = await render(element);
    expect(result.text).toContain('Additional safety notes');
    expect(result.text).toContain('harmful');
  });

  it('should export STANDARD_GUARDRAILS constant', () => {
    expect(STANDARD_GUARDRAILS).toBeDefined();
    expect(STANDARD_GUARDRAILS.standard).toBeDefined();
    expect(STANDARD_GUARDRAILS.strict).toBeDefined();
    expect(STANDARD_GUARDRAILS.minimal).toBeDefined();
    expect(STANDARD_GUARDRAILS.standard.length).toBeGreaterThan(0);
    expect(STANDARD_GUARDRAILS.strict.length).toBeGreaterThan(STANDARD_GUARDRAILS.standard.length);
  });
});
