import { describe, it, expect } from 'vitest';
import { createPromptFromSource } from '../../../src/create-prompt';
import { render } from '../../../src/render';
import { jsx, jsxs } from '../../../src/jsx-runtime';
import { References } from '../../../components/structural/References';
import { Reference } from '../../../components/structural/Reference';

describe('References e2e', () => {
  it('should render Reference children through .prompt pipeline', async () => {
    const source = `
<Prompt name="references-test" bare>
  <Task>Help me write code.</Task>
  <References>
    <Reference title="API Docs" url="https://api.example.com" />
    <Reference title="Wiki" description="Internal docs" />
  </References>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'references.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('API Docs');
    expect(result.text).toContain('https://api.example.com');
    expect(result.text).toContain('Wiki');
    expect(result.text).toContain('Internal docs');
  });

  it('should render sources through .prompt pipeline', async () => {
    const source = `
<Prompt name="references-sources" bare>
  <Task>Help me write code.</Task>
  <References sources={[{ title: 'API Docs', url: 'https://api.example.com/docs' }]} />
</Prompt>
`;
    const element = await createPromptFromSource(source, 'references-sources.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('API Docs');
    expect(result.text).toContain('https://api.example.com/docs');
  });

  describe('snapshots', () => {
    it('should match snapshot: references with sources and children', async () => {
      const element = jsxs(References, {
        sources: [
          { title: 'External API', url: 'https://api.example.com' },
        ],
        children: [
          jsx(Reference, { title: 'Internal Wiki', description: 'Team conventions' }),
        ],
      });
      const result = await render(element);
      expect(result.text).toMatchSnapshot();
    });
  });
});
