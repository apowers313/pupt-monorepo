import { describe, expect,it } from 'vitest';

import { createPromptFromSource } from '../../src/create-prompt';
import { render } from '../../src/render';

describe('JSX newline preservation (issue #25)', () => {
  it('should preserve newlines in Context multi-line text content', async () => {
    const source = `
<Prompt name="newline-test" bare>
  <Context type="reference" label="Review Methodology">
This review follows established code review methodologies:
- Google Engineering Practices: Focus on improving overall code health
- Microsoft Research: Limit review scope for effectiveness
- OWASP: Apply Top 10 awareness for security-relevant code paths
- SmartBear research: Reviews of 200-400 lines are most effective
  </Context>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'newline-test.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    // Each bullet point should be on its own line, not collapsed into a single line
    expect(result.text).toContain('methodologies:\n-');
    expect(result.text).toContain('health\n-');
    expect(result.text).toContain('effectiveness\n-');
    expect(result.text).toContain('paths\n-');
  });

  it('should preserve newlines in indented multi-line text content', async () => {
    const source = `
<Prompt name="indented-newline" bare>
  <Context label="Info">
    Line one
    Line two
    Line three
  </Context>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'indented-newline.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('Line one\nLine two\nLine three');
  });

  it('should preserve blank lines between paragraphs', async () => {
    const source = `
<Prompt name="paragraph-test" bare>
  <Context>
    Paragraph one content.

    Paragraph two content.
  </Context>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'paragraph-test.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('Paragraph one content.\n\nParagraph two content.');
  });

  it('should not change single-line text content', async () => {
    const source = `
<Prompt name="single-line" bare>
  <Context>This is a single line of text.</Context>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'single-line.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('This is a single line of text.');
  });

  it('should preserve newlines in Task component', async () => {
    const source = `
<Prompt name="task-newline" bare>
  <Task>
    Step 1: Read the input
    Step 2: Process the data
    Step 3: Return the result
  </Task>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'task-newline.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('Step 1: Read the input\nStep 2: Process the data\nStep 3: Return the result');
  });

  it('should preserve newlines in Section component', async () => {
    const source = `
<Prompt name="section-newline" bare>
  <Section name="instructions">
    First instruction
    Second instruction
    Third instruction
  </Section>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'section-newline.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('First instruction\nSecond instruction\nThird instruction');
  });

  it('should preserve newlines in Role component', async () => {
    const source = `
<Prompt name="role-newline" bare>
  <Role>
    You are a senior code reviewer.
    You have 10 years of experience.
    You focus on correctness and security.
  </Role>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'role-newline.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('You are a senior code reviewer.\nYou have 10 years of experience.\nYou focus on correctness and security.');
  });

  it('should preserve newlines in Constraint component', async () => {
    const source = `
<Prompt name="constraint-newline" bare>
  <Constraint>
    Must be thread-safe
    Must handle errors gracefully
    Must log all operations
  </Constraint>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'constraint-newline.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('Must be thread-safe\nMust handle errors gracefully\nMust log all operations');
  });

  it('should handle mixed content with expression containers', async () => {
    const source = `
<Prompt name="mixed-content" bare>
  <Context>
    {"explicit string"}
  </Context>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'mixed-content.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('explicit string');
  });

  it('should handle text with varying indentation levels', async () => {
    const source = `
<Prompt name="indent-levels" bare>
  <Context>
    Top level
      Indented level
        Deep indented
      Back to indented
    Back to top
  </Context>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'indent-levels.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('Top level\n  Indented level\n    Deep indented\n  Back to indented\nBack to top');
  });
});
