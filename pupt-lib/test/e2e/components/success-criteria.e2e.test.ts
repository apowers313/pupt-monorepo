import { describe, it, expect } from 'vitest';
import { createPromptFromSource } from '../../../src/create-prompt';
import { render } from '../../../src/render';
import { jsx } from '../../../src/jsx-runtime';
import { SuccessCriteria } from '../../../components/structural/SuccessCriteria';

describe('SuccessCriteria e2e', () => {
  it('should render presets through .prompt pipeline', async () => {
    const source = `
<Prompt name="criteria-presets" bare>
  <Task>Write documentation.</Task>
  <SuccessCriteria presets={['accuracy', 'clarity']} />
</Prompt>
`;
    const element = await createPromptFromSource(source, 'criteria-presets.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('factually accurate');
    expect(result.text).toContain('Easy to follow');
  });

  it('should render metrics through pipeline', async () => {
    const source = `
<Prompt name="criteria-metrics" bare>
  <Task>Generate code.</Task>
  <SuccessCriteria metrics={[{ name: 'Accuracy', threshold: '95%' }]} />
</Prompt>
`;
    const element = await createPromptFromSource(source, 'criteria-metrics.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('Accuracy');
    expect(result.text).toContain('95%');
  });

  it('should render children criteria through pipeline', async () => {
    const source = `
<Prompt name="criteria-children" bare>
  <SuccessCriteria>
    All edge cases must be handled.
  </SuccessCriteria>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'criteria-children.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('edge cases');
  });

  describe('snapshots', () => {
    it('should match snapshot: presets with metrics', async () => {
      const element = jsx(SuccessCriteria, {
        presets: ['accuracy', 'completeness'],
        metrics: [
          { name: 'Coverage', threshold: '80%' },
          { name: 'Accuracy', threshold: '95%' },
        ],
      });
      const result = await render(element);
      expect(result.text).toMatchSnapshot();
    });

    it('should match snapshot: presets with markdown delimiter', async () => {
      const element = jsx(SuccessCriteria, {
        presets: ['clarity'],
        delimiter: 'markdown',
      });
      const result = await render(element);
      expect(result.text).toMatchSnapshot();
    });
  });
});
