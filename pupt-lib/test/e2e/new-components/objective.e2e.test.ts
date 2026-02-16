import { describe, it, expect } from 'vitest';
import { createPromptFromSource } from '../../../src/create-prompt';
import { render } from '../../../src/render';
import { jsx } from '../../../src/jsx-runtime';
import { Objective } from '../../../components/structural/Objective';

describe('Objective e2e', () => {
  it('should render primary goal through .prompt pipeline', async () => {
    const source = `
<Prompt name="objective-primary" bare>
  <Task>Complete the objective.</Task>
  <Objective primary="Build a REST API" />
</Prompt>
`;
    const element = await createPromptFromSource(source, 'objective-primary.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('Build a REST API');
  });

  it('should render secondary goals through .prompt pipeline', async () => {
    const source = `
<Prompt name="objective-secondary" bare>
  <Task>Complete the objective.</Task>
  <Objective primary="Build a REST API" secondary={['Handle authentication', 'Support pagination']} />
</Prompt>
`;
    const element = await createPromptFromSource(source, 'objective-secondary.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('Handle authentication');
    expect(result.text).toContain('Support pagination');
  });

  it('should render metrics through .prompt pipeline', async () => {
    const source = `
<Prompt name="objective-metrics" bare>
  <Task>Complete the objective.</Task>
  <Objective primary="Build a REST API" metrics={['99.9% uptime']} />
</Prompt>
`;
    const element = await createPromptFromSource(source, 'objective-metrics.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('99.9% uptime');
  });

  describe('snapshots', () => {
    it('should match snapshot: primary with secondary goals', async () => {
      const element = jsx(Objective, {
        primary: 'Build a REST API',
        secondary: ['Handle authentication', 'Support pagination'],
        metrics: ['< 200ms response time', '99.9% uptime'],
      });
      const result = await render(element);
      expect(result.text).toMatchSnapshot();
    });

    it('should match snapshot: primary only', async () => {
      const element = jsx(Objective, {
        primary: 'Summarize the document',
      });
      const result = await render(element);
      expect(result.text).toMatchSnapshot();
    });
  });
});
