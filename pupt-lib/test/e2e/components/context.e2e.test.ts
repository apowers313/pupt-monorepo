import { describe, it, expect } from 'vitest';
import { createPromptFromSource } from '../../../src/create-prompt';
import { render } from '../../../src/render';
import { jsx } from '../../../src/jsx-runtime';
import { Context } from '../../../components/structural/Context';

describe('Context e2e', () => {
  it('should render context with label through .prompt pipeline', async () => {
    const source = `
<Prompt name="context-label" bare>
  <Context label="Background">The project was started in 2020.</Context>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'context-label.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('Background');
    expect(result.text).toContain('2020');
  });

  it('should render context with source through pipeline', async () => {
    const source = `
<Prompt name="context-source" bare>
  <Context source="internal wiki">Company policy requires code reviews.</Context>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'context-source.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('internal wiki');
    expect(result.text).toContain('code reviews');
  });

  it('should render context with type and relevance through pipeline', async () => {
    const source = `
<Prompt name="context-type" bare>
  <Context type="background" relevance="Sets the operational parameters">Configuration is set to production mode.</Context>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'context-type.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('production mode');
    expect(result.text).toContain('Relevant because');
  });

  describe('snapshots', () => {
    it('should match snapshot: context with label and source', async () => {
      const element = jsx(Context, {
        label: 'Project Info',
        source: 'docs',
        children: 'This is a TypeScript project.',
      });
      const result = await render(element);
      expect(result.text).toMatchSnapshot();
    });

    it('should match snapshot: context with type and relevance', async () => {
      const element = jsx(Context, {
        type: 'background',
        relevance: 'Provides essential background for the task',
        children: 'The system uses microservices architecture.',
      });
      const result = await render(element);
      expect(result.text).toMatchSnapshot();
    });

    it('should match snapshot: context with markdown delimiter', async () => {
      const element = jsx(Context, {
        label: 'Requirements',
        delimiter: 'markdown',
        children: 'Must support both Node.js and browser.',
      });
      const result = await render(element);
      expect(result.text).toMatchSnapshot();
    });
  });

  describe('content handling props', () => {
    it('should render truncate hint through pipeline', async () => {
      const source = `
<Prompt name="ctx-truncate" bare>
  <Context truncate>
    Long content that may need truncation
  </Context>
</Prompt>
`;
      const element = await createPromptFromSource(source, 'ctx-truncate.prompt');
      const result = await render(element);
      expect(result.ok).toBe(true);
      expect(result.text).toContain('may be truncated');
      expect(result.text).toContain('Long content');
      expect(result.text).toMatchSnapshot();
    });

    it('should render maxTokens hint through pipeline', async () => {
      const source = `
<Prompt name="ctx-tokens" bare>
  <Context maxTokens={2000} label="Document">
    Some long document content
  </Context>
</Prompt>
`;
      const element = await createPromptFromSource(source, 'ctx-tokens.prompt');
      const result = await render(element);
      expect(result.ok).toBe(true);
      expect(result.text).toContain('2000');
      expect(result.text).toContain('Document');
      expect(result.text).toMatchSnapshot();
    });

    it('should render preserveFormatting hint through pipeline', async () => {
      const source = `
<Prompt name="ctx-preserve" bare>
  <Context preserveFormatting>
    {"  indented\\n    content"}
  </Context>
</Prompt>
`;
      const element = await createPromptFromSource(source, 'ctx-preserve.prompt');
      const result = await render(element);
      expect(result.ok).toBe(true);
      expect(result.text).toContain('preserve formatting');
      expect(result.text).toMatchSnapshot();
    });

    it('should render all new props combined through pipeline', async () => {
      const source = `
<Prompt name="ctx-combined" bare>
  <Context truncate maxTokens={1500} preserveFormatting label="API Response">
    Some API data
  </Context>
</Prompt>
`;
      const element = await createPromptFromSource(source, 'ctx-combined.prompt');
      const result = await render(element);
      expect(result.ok).toBe(true);
      expect(result.text).toContain('may be truncated');
      expect(result.text).toContain('1500');
      expect(result.text).toContain('preserve formatting');
      expect(result.text).toContain('API Response');
      expect(result.text).toMatchSnapshot();
    });
  });
});
