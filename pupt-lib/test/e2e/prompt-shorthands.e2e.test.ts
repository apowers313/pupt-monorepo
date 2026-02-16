import { describe, expect,it } from 'vitest';

import { createPromptFromSource } from '../../src/create-prompt';
import { render } from '../../src/render';

describe('Prompt shorthand disable props e2e', () => {
  it('should render with noRole through pipeline', async () => {
    const source = `
<Prompt name="no-role" noRole>
  <Task>Summarize this document</Task>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'no-role.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).not.toContain('Assistant');
    expect(result.text).toContain('Summarize this document');
    // Should still have constraints
    expect(result.text).toContain('concise');
    expect(result.text).toMatchSnapshot();
  });

  it('should render with noFormat through pipeline', async () => {
    const source = `
<Prompt name="no-format" noFormat>
  <Task>Summarize this document</Task>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'no-format.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).not.toContain('Output format');
    expect(result.text).toContain('Summarize this document');
    expect(result.text).toMatchSnapshot();
  });

  it('should render with noConstraints through pipeline', async () => {
    const source = `
<Prompt name="no-constraints" noConstraints>
  <Task>Summarize this document</Task>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'no-constraints.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).not.toContain('concise');
    expect(result.text).toContain('Summarize this document');
    expect(result.text).toMatchSnapshot();
  });

  it('should render with defaults="none" through pipeline', async () => {
    const source = `
<Prompt name="defaults-none" defaults="none">
  <Task>Summarize this document</Task>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'defaults-none.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).not.toContain('Assistant');
    expect(result.text).not.toContain('concise');
    expect(result.text).not.toContain('Output format');
    expect(result.text).toContain('Summarize this document');
    expect(result.text).toMatchSnapshot();
  });

  it('should render with multiple shorthand props through pipeline', async () => {
    const source = `
<Prompt name="multi-shorthand" noRole noConstraints>
  <Task>Summarize this document</Task>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'multi-shorthand.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).not.toContain('Assistant');
    expect(result.text).not.toContain('concise');
    expect(result.text).toContain('Summarize this document');
    expect(result.text).toMatchSnapshot();
  });
});
