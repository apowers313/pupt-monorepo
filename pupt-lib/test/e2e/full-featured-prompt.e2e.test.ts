import { describe, expect,it } from 'vitest';

import { Example } from '../../components/examples/Example';
import { ExampleInput } from '../../components/examples/ExampleInput';
import { ExampleOutput } from '../../components/examples/ExampleOutput';
import { Examples } from '../../components/examples/Examples';
import { Steps } from '../../components/reasoning/Steps';
import { Constraint } from '../../components/structural/Constraint';
import { Constraints } from '../../components/structural/Constraints';
import { Context } from '../../components/structural/Context';
import { Format } from '../../components/structural/Format';
import { Guardrails } from '../../components/structural/Guardrails';
import { Prompt } from '../../components/structural/Prompt';
import { Task } from '../../components/structural/Task';
import { WhenUncertain } from '../../components/structural/WhenUncertain';
import { createPromptFromSource } from '../../src/create-prompt';
import { jsx } from '../../src/jsx-runtime';
import { render } from '../../src/render';
import { createEnvironment } from '../../src/types/context';


describe('Full-featured prompt e2e', () => {
  it('should render a complete prompt with all features through pipeline', async () => {
    const source = `
<Prompt name="full-featured" role="engineer" expertise="TypeScript">
  <Context label="Project">Building a React app</Context>
  <Task preset="code-review" subject="the PR" />
  <Constraints extend>
    <Constraint type="must">Include code examples</Constraint>
  </Constraints>
  <Format type="markdown" strict />
  <Steps preset="problem-solving" verify />
  <Guardrails preset="standard" />
  <WhenUncertain action="ask" />
  <Examples>
    <Example>
      <Example.Input>Review this function</Example.Input>
      <Example.Output>The function has a potential null reference...</Example.Output>
    </Example>
  </Examples>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'full-featured.prompt');

    // Test with different providers
    for (const provider of ['anthropic', 'openai', 'google'] as const) {
      const result = await render(element, { env: createEnvironment({ llm: { provider } }) });
      expect(result.ok).toBe(true);
      expect(result.text).toContain('Software Engineer');
      expect(result.text).toContain('TypeScript');
      expect(result.text).toContain('Building a React app');
      expect(result.text).toContain('PR');
      expect(result.text).toContain('code examples');
      expect(result.text).toContain('markdown');
      expect(result.text).toContain('harmful'); // guardrails
      expect(result.text).toContain('clarifying questions'); // when uncertain
      expect(result.text).toMatchSnapshot();
    }
  });

  it('should render a complete prompt via JSX API', async () => {
    const element = jsx(Prompt, {
      name: 'full-featured-jsx',
      role: 'engineer',
      expertise: 'TypeScript',
      children: [
        jsx(Context, { label: 'Project', children: 'Building a React app' }),
        jsx(Task, { preset: 'code-review', subject: 'the PR' }),
        jsx(Constraints, { extend: true, children: [
          jsx(Constraint, { type: 'must', children: 'Include code examples' }),
        ] }),
        jsx(Format, { type: 'markdown', strict: true }),
        jsx(Steps, { preset: 'problem-solving', verify: true }),
        jsx(Guardrails, { preset: 'standard' }),
        jsx(WhenUncertain, { action: 'ask' }),
        jsx(Examples, {
          children: jsx(Example, {
            children: [
              jsx(ExampleInput, { children: 'Review this function' }),
              jsx(ExampleOutput, { children: 'The function has a potential null reference...' }),
            ],
          }),
        }),
      ],
    });

    const result = await render(element, { env: createEnvironment({ llm: { provider: 'anthropic' } }) });
    expect(result.ok).toBe(true);
    expect(result.text).toContain('Software Engineer');
    expect(result.text).toContain('TypeScript');
    expect(result.text).toContain('Building a React app');
    expect(result.text).toContain('PR');
    expect(result.text).toContain('code examples');
    expect(result.text).toContain('markdown');
    expect(result.text).toContain('harmful');
    expect(result.text).toContain('clarifying questions');
  });

  it('should produce consistent output across pipeline and JSX API', async () => {
    const source = `
<Prompt name="consistency-test" role="engineer" expertise="Python" bare>
  <Task>Write a function</Task>
  <Format type="json" />
</Prompt>
`;
    const pipelineElement = await createPromptFromSource(source, 'consistency.prompt');
    const pipelineResult = await render(pipelineElement);

    const jsxElement = jsx(Prompt, {
      name: 'consistency-test',
      role: 'engineer',
      expertise: 'Python',
      bare: true,
      children: [
        jsx(Task, { children: 'Write a function' }),
        jsx(Format, { type: 'json' }),
      ],
    });
    const jsxResult = await render(jsxElement);

    expect(pipelineResult.ok).toBe(true);
    expect(jsxResult.ok).toBe(true);
    expect(pipelineResult.text).toBe(jsxResult.text);
  });
});
