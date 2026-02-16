import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/render';
import { jsx } from '../../../../src/jsx-runtime';
import { Role } from '../../../../components/structural/Role';

describe('Role presets', () => {
  it('should render engineer preset', async () => {
    const element = jsx(Role, { preset: 'engineer' });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('Software Engineer');
  });

  it('should combine preset with additional expertise', async () => {
    const element = jsx(Role, { preset: 'engineer', expertise: 'TypeScript, React' });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('TypeScript');
    expect(result.text).toContain('React');
  });

  it('should adapt role prefix for different providers', async () => {
    const element = jsx(Role, { preset: 'engineer' });
    const claudeResult = await render(element, { env: { llm: { provider: 'anthropic' } } });
    expect(claudeResult.text).toContain('You are');

    const geminiResult = await render(element, { env: { llm: { provider: 'google' } } });
    expect(geminiResult.text).toContain('Your role:');
  });

  it('should prefer children over preset', async () => {
    const element = jsx(Role, { preset: 'engineer', children: 'Custom role text' });
    const result = await render(element);
    expect(result.text).toContain('Custom role text');
  });

  it('should render experience level prefix', async () => {
    const element = jsx(Role, { preset: 'engineer', experience: 'expert' });
    const result = await render(element);
    expect(result.text).toContain('expert');
    expect(result.text).toContain('Software Engineer');
  });

  it('should render traits from preset', async () => {
    const element = jsx(Role, { preset: 'engineer' });
    const result = await render(element);
    expect(result.text).toContain('analytical');
  });

  it('should render custom traits', async () => {
    const element = jsx(Role, { preset: 'assistant', traits: ['patient', 'thorough'] });
    const result = await render(element);
    expect(result.text).toContain('patient');
    expect(result.text).toContain('thorough');
  });

  it('should render domain specialization', async () => {
    const element = jsx(Role, { preset: 'consultant', domain: 'healthcare' });
    const result = await render(element);
    expect(result.text).toContain('healthcare');
  });

  it('should render writer preset', async () => {
    const element = jsx(Role, { preset: 'writer' });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('Writer');
  });

  it('should render with custom title overriding preset', async () => {
    const element = jsx(Role, { preset: 'engineer', title: 'Cloud Architect' });
    const result = await render(element);
    expect(result.text).toContain('Cloud Architect');
  });

  it('should handle expertise as array', async () => {
    const element = jsx(Role, { preset: 'engineer', expertise: ['TypeScript', 'React', 'Node.js'] });
    const result = await render(element);
    expect(result.text).toContain('TypeScript');
    expect(result.text).toContain('React');
    expect(result.text).toContain('Node.js');
  });

  it('should fallback to Assistant when no preset specified', async () => {
    const element = jsx(Role, {});
    const result = await render(element);
    expect(result.text).toContain('Assistant');
  });
});
