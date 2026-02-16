import { describe, expect,it } from 'vitest';

import { Task } from '../../../components/structural/Task';
import { createPromptFromSource } from '../../../src/create-prompt';
import { jsx } from '../../../src/jsx-runtime';
import { render } from '../../../src/render';

describe('Task e2e', () => {
  it('should render task preset through .prompt pipeline', async () => {
    const source = `
<Prompt name="task-preset" bare>
  <Role>You are a code reviewer.</Role>
  <Task preset="code-review" />
</Prompt>
`;
    const element = await createPromptFromSource(source, 'task-preset.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('Review');
  });

  it('should render task with verb and subject through .prompt pipeline', async () => {
    const source = `
<Prompt name="task-verb-subject" bare>
  <Task verb="Analyze" subject="sales data" />
</Prompt>
`;
    const element = await createPromptFromSource(source, 'task-verb-subject.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('Analyze');
    expect(result.text).toContain('sales data');
  });

  it('should render task with scope and complexity through pipeline', async () => {
    const source = `
<Prompt name="task-scope" bare>
  <Task scope="narrow" complexity="simple">Summarize the key point.</Task>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'task-scope.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('Summarize the key point');
  });

  describe('snapshots', () => {
    it('should match snapshot: preset summarize', async () => {
      const element = jsx(Task, { preset: 'summarize' });
      const result = await render(element);
      expect(result.text).toMatchSnapshot();
    });

    it('should match snapshot: verb + subject with children', async () => {
      const element = jsx(Task, {
        verb: 'Generate',
        subject: 'unit tests',
        children: 'Cover edge cases and error paths.',
      });
      const result = await render(element);
      expect(result.text).toMatchSnapshot();
    });

    it('should match snapshot: preset with markdown delimiter', async () => {
      const element = jsx(Task, { preset: 'code-review', delimiter: 'markdown' });
      const result = await render(element);
      expect(result.text).toMatchSnapshot();
    });
  });
});
