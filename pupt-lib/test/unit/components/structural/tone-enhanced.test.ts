import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/render';
import { jsx } from '../../../../src/jsx-runtime';
import { Tone } from '../../../../components/structural/Tone';

describe('Tone enhanced props', () => {
  it('should render type with description', async () => {
    const element = jsx(Tone, { type: 'professional' });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('professional');
    expect(result.text).toContain('formal');
  });

  it('should render friendly type', async () => {
    const element = jsx(Tone, { type: 'friendly' });
    const result = await render(element);
    expect(result.text).toContain('warm');
    expect(result.text).toContain('approachable');
  });

  it('should render voice characteristics', async () => {
    const element = jsx(Tone, {
      formality: 'informal',
      energy: 'energetic',
      warmth: 'warm',
    });
    const result = await render(element);
    expect(result.text).toContain('formality: informal');
    expect(result.text).toContain('energy: energetic');
    expect(result.text).toContain('warmth: warm');
  });

  it('should render brand voice', async () => {
    const element = jsx(Tone, { brandVoice: 'Slack' });
    const result = await render(element);
    expect(result.text).toContain('Slack brand voice');
  });

  it('should render avoidTones', async () => {
    const element = jsx(Tone, { avoidTones: ['formal', 'distant'] });
    const result = await render(element);
    expect(result.text).toContain('Avoid these tones: formal, distant');
  });

  it('should prefer children over props', async () => {
    const element = jsx(Tone, {
      type: 'professional',
      children: 'Custom tone instructions',
    });
    const result = await render(element);
    expect(result.text).toContain('Custom tone instructions');
  });

  it('should render all tone types', async () => {
    for (const type of ['academic', 'authoritative', 'empathetic', 'enthusiastic', 'neutral'] as const) {
      const element = jsx(Tone, { type });
      const result = await render(element);
      expect(result.ok).toBe(true);
      expect(result.text).toContain(type);
    }
  });
});
