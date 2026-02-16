import { describe, expect,it } from 'vitest';

import { Format } from '../../../components/structural/Format';
import { createPromptFromSource } from '../../../src/create-prompt';
import { jsx } from '../../../src/jsx-runtime';
import { render } from '../../../src/render';

describe('Format e2e', () => {
  it('should render format with type through .prompt pipeline', async () => {
    const source = `
<Prompt name="format-type" bare>
  <Task>Summarize the article.</Task>
  <Format type="json" />
</Prompt>
`;
    const element = await createPromptFromSource(source, 'format-type.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('json');
  });

  it('should render format with schema through pipeline', async () => {
    const source = `
<Prompt name="format-schema" bare>
  <Task>Extract entities.</Task>
  <Format type="json" schema={{"name": "string", "age": "number"}} />
</Prompt>
`;
    const element = await createPromptFromSource(source, 'format-schema.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('json');
    expect(result.text).toContain('name');
  });

  it('should render strict format through pipeline', async () => {
    const source = `
<Prompt name="format-strict" bare>
  <Task>Generate output.</Task>
  <Format type="json" strict={true} />
</Prompt>
`;
    const element = await createPromptFromSource(source, 'format-strict.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('ONLY');
  });

  describe('snapshots', () => {
    it('should match snapshot: json format with schema', async () => {
      const element = jsx(Format, {
        type: 'json',
        schema: '{"result": "string"}',
      });
      const result = await render(element);
      expect(result.text).toMatchSnapshot();
    });

    it('should match snapshot: markdown format with strict', async () => {
      const element = jsx(Format, {
        type: 'markdown',
        strict: true,
      });
      const result = await render(element);
      expect(result.text).toMatchSnapshot();
    });

    it('should match snapshot: format with length constraints', async () => {
      const element = jsx(Format, {
        type: 'text',
        maxLength: '500 words',
        minLength: '100 words',
      });
      const result = await render(element);
      expect(result.text).toMatchSnapshot();
    });
  });
});
