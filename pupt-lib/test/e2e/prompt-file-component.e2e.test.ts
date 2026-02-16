import { describe, expect,it } from 'vitest';

import { createPromptFromSource } from '../../src/create-prompt';
import { render } from '../../src/render';

describe('.prompt file component rendering e2e', () => {
  it('should render a simple declarative .prompt file', async () => {
    const source = `
<Section name="when-uncertain">
  If you are unsure, ask clarifying questions before proceeding.
</Section>
`;
    const element = await createPromptFromSource(source, 'when-uncertain.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('clarifying questions');
    expect(result.text).toMatchSnapshot();
  });

  it('should render a full prompt with multiple sections as .prompt', async () => {
    const source = `
<Prompt name="full-prompt" bare>
  <Role>You are a code reviewer.</Role>
  <Task>Review the provided code for bugs and improvements.</Task>
  <Context label="Guidelines">Follow SOLID principles.</Context>
  <Constraint type="must">Be constructive in feedback.</Constraint>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'full-prompt.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('code reviewer');
    expect(result.text).toContain('Review the provided code');
    expect(result.text).toContain('SOLID principles');
    expect(result.text).toContain('constructive');
    expect(result.text).toMatchSnapshot();
  });

  it('should render a .prompt file with If control flow', async () => {
    const source = `
<Prompt name="conditional" bare>
  <Task>Main task</Task>
  <If when={true}>
    <Section name="extra">Extra instructions</Section>
  </If>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'conditional.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('Main task');
    expect(result.text).toContain('Extra instructions');
  });
});
