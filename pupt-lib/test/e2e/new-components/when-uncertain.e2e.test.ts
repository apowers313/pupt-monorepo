import { describe, it, expect } from 'vitest';
import { createPromptFromSource } from '../../../src/create-prompt';
import { render } from '../../../src/render';
import { jsx } from '../../../src/jsx-runtime';
import { WhenUncertain } from '../../../components/structural/WhenUncertain';

describe('WhenUncertain e2e', () => {
  it('should render acknowledge action through .prompt pipeline', async () => {
    const source = `
<Prompt name="uncertain-ack" bare>
  <Task>Answer questions.</Task>
  <WhenUncertain action="acknowledge" />
</Prompt>
`;
    const element = await createPromptFromSource(source, 'uncertain-ack.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('not certain');
  });

  it('should render ask action through pipeline', async () => {
    const source = `
<Prompt name="uncertain-ask" bare>
  <Task>Answer questions.</Task>
  <WhenUncertain action="ask" />
</Prompt>
`;
    const element = await createPromptFromSource(source, 'uncertain-ask.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('clarifying questions');
  });

  it('should render decline action through pipeline', async () => {
    const source = `
<Prompt name="uncertain-decline" bare>
  <Task>Answer questions.</Task>
  <WhenUncertain action="decline" />
</Prompt>
`;
    const element = await createPromptFromSource(source, 'uncertain-decline.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('decline');
  });

  it('should render estimate action through pipeline', async () => {
    const source = `
<Prompt name="uncertain-estimate" bare>
  <Task>Answer questions.</Task>
  <WhenUncertain action="estimate" />
</Prompt>
`;
    const element = await createPromptFromSource(source, 'uncertain-estimate.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('best estimate');
  });

  describe('snapshots', () => {
    it('should match snapshot: each action type', async () => {
      const actions = ['acknowledge', 'ask', 'decline', 'estimate'] as const;
      for (const action of actions) {
        const element = jsx(WhenUncertain, { action });
        const result = await render(element);
        expect(result.text).toMatchSnapshot();
      }
    });
  });
});
