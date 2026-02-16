import { describe, it, expect } from 'vitest';
import { createPromptFromSource } from '../../../src/create-prompt';
import { render } from '../../../src/render';
import { jsx } from '../../../src/jsx-runtime';
import { Tone } from '../../../components/structural/Tone';

describe('Tone e2e', () => {
  it('should render tone type through .prompt pipeline', async () => {
    const source = `
<Prompt name="tone-type" bare>
  <Task>Write a response.</Task>
  <Tone type="professional" />
</Prompt>
`;
    const element = await createPromptFromSource(source, 'tone-type.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('professional');
  });

  it('should render tone with formality through pipeline', async () => {
    const source = `
<Prompt name="tone-formality" bare>
  <Task>Write a response.</Task>
  <Tone type="friendly" formality="informal" energy="energetic" />
</Prompt>
`;
    const element = await createPromptFromSource(source, 'tone-formality.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('friendly');
    expect(result.text).toContain('informal');
    expect(result.text).toContain('energetic');
  });

  it('should render tone children through pipeline', async () => {
    const source = `
<Prompt name="tone-children" bare>
  <Tone>Write with a calm, measured, and reassuring voice.</Tone>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'tone-children.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('calm, measured');
  });

  describe('snapshots', () => {
    it('should match snapshot: professional tone with formality', async () => {
      const element = jsx(Tone, {
        type: 'professional',
        formality: 'formal',
        warmth: 'neutral',
      });
      const result = await render(element);
      expect(result.text).toMatchSnapshot();
    });

    it('should match snapshot: friendly tone with brand voice', async () => {
      const element = jsx(Tone, {
        type: 'friendly',
        brandVoice: 'Acme Corp',
        avoidTones: ['sarcastic', 'condescending'],
      });
      const result = await render(element);
      expect(result.text).toMatchSnapshot();
    });
  });
});
