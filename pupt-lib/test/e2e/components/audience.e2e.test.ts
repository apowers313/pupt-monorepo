import { describe, expect,it } from 'vitest';

import { Audience } from '../../../components/structural/Audience';
import { createPromptFromSource } from '../../../src/create-prompt';
import { jsx } from '../../../src/jsx-runtime';
import { render } from '../../../src/render';

describe('Audience e2e', () => {
  it('should render audience with level through .prompt pipeline', async () => {
    const source = `
<Prompt name="audience-level" bare>
  <Task>Explain React hooks.</Task>
  <Audience level="beginner" type="technical" />
</Prompt>
`;
    const element = await createPromptFromSource(source, 'audience-level.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('beginner');
    expect(result.text).toContain('simple language');
  });

  it('should render audience with description through pipeline', async () => {
    const source = `
<Prompt name="audience-desc" bare>
  <Task>Write documentation.</Task>
  <Audience level="expert" description="Senior backend engineers familiar with distributed systems" />
</Prompt>
`;
    const element = await createPromptFromSource(source, 'audience-desc.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('distributed systems');
    expect(result.text).toContain('peer');
  });

  it('should render audience children through pipeline', async () => {
    const source = `
<Prompt name="audience-children" bare>
  <Audience>Marketing team with limited technical background</Audience>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'audience-children.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('Marketing team');
  });

  describe('snapshots', () => {
    it('should match snapshot: beginner technical audience', async () => {
      const element = jsx(Audience, { level: 'beginner', type: 'technical' });
      const result = await render(element);
      expect(result.text).toMatchSnapshot();
    });

    it('should match snapshot: expert audience with goals', async () => {
      const element = jsx(Audience, {
        level: 'expert',
        type: 'technical',
        goals: ['optimize performance', 'reduce latency'],
      });
      const result = await render(element);
      expect(result.text).toMatchSnapshot();
    });
  });
});
