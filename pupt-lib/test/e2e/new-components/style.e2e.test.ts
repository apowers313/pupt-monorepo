import { describe, expect,it } from 'vitest';

import { Style } from '../../../components/structural/Style';
import { createPromptFromSource } from '../../../src/create-prompt';
import { jsx } from '../../../src/jsx-runtime';
import { render } from '../../../src/render';

describe('Style e2e', () => {
  it('should render style type through .prompt pipeline', async () => {
    const source = `
<Prompt name="style-type" bare>
  <Task>Write a response.</Task>
  <Style type="concise" />
</Prompt>
`;
    const element = await createPromptFromSource(source, 'style-type.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('concise');
  });

  it('should render style with verbosity through pipeline', async () => {
    const source = `
<Prompt name="style-verbosity" bare>
  <Task>Write a response.</Task>
  <Style type="technical" verbosity="minimal" formality="formal" />
</Prompt>
`;
    const element = await createPromptFromSource(source, 'style-verbosity.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('technical');
    expect(result.text).toContain('minimal');
    expect(result.text).toContain('formal');
  });

  it('should render style children through pipeline', async () => {
    const source = `
<Prompt name="style-children" bare>
  <Task>Write a response.</Task>
  <Style>Write like Ernest Hemingway — short, punchy sentences.</Style>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'style-children.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('Hemingway');
  });

  describe('snapshots', () => {
    it('should match snapshot: academic style with formality', async () => {
      const element = jsx(Style, {
        type: 'academic',
        verbosity: 'verbose',
        formality: 'formal',
      });
      const result = await render(element);
      expect(result.text).toMatchSnapshot();
    });
  });
});
