import { describe, expect,it } from 'vitest';

import { createPromptFromSource } from '../../src/create-prompt';
import { render } from '../../src/render';

describe('.prompt file component definitions', () => {
  it('should be able to render a component defined in a .prompt file', async () => {
    // Test whether the preprocessor/transformer pipeline can handle
    // a .prompt file that defines a reusable component (function component)
    // This validates Design Requirement 6
    const source = `
<Section name="when-uncertain">
  If you are unsure, ask clarifying questions before proceeding.
</Section>
`;
    const element = await createPromptFromSource(source, 'when-uncertain.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('clarifying questions');
  });

  it('should render a purely declarative .prompt using only built-in components', async () => {
    const source = `
<Prompt name="simple-test" bare>
  <Role>You are a helpful assistant.</Role>
  <Task>Answer questions.</Task>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'simple.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('helpful assistant');
    expect(result.text).toContain('Answer questions');
  });

  it('should render a .prompt file with nested built-in components', async () => {
    const source = `
<Prompt name="nested-test" bare>
  <Section name="instructions">
    <Task>Do the thing</Task>
    <Context label="Background">Some background info</Context>
  </Section>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'nested.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('Do the thing');
    expect(result.text).toContain('Background');
    expect(result.text).toContain('Some background info');
  });

  it('should handle a .prompt file with control flow components', async () => {
    const source = `
<Prompt name="control-test" bare>
  <Task>Main task</Task>
  <If when={true}>
    <Context>Conditional context</Context>
  </If>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'control.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('Main task');
    expect(result.text).toContain('Conditional context');
  });
});
