import { describe, it, expect } from 'vitest';
import { createPromptFromSource } from '../../../src/create-prompt';
import { render } from '../../../src/render';
import { jsx } from '../../../src/jsx-runtime';
import { Specialization } from '../../../components/structural/Specialization';

describe('Specialization e2e', () => {
  it('should render areas through .prompt pipeline', async () => {
    const source = `
<Prompt name="specialization-areas" bare>
  <Task>Provide guidance.</Task>
  <Specialization areas={['TypeScript', 'React']} level="expert" />
</Prompt>
`;
    const element = await createPromptFromSource(source, 'specialization-areas.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('TypeScript');
    expect(result.text).toContain('React');
    expect(result.text).toContain('expert');
  });

  it('should render single area through pipeline', async () => {
    const source = `
<Prompt name="specialization-single" bare>
  <Task>Provide guidance.</Task>
  <Specialization areas="cloud architecture" level="proficient" />
</Prompt>
`;
    const element = await createPromptFromSource(source, 'specialization-single.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('cloud architecture');
    expect(result.text).toContain('proficient');
  });

  describe('snapshots', () => {
    it('should match snapshot: multiple areas with expert level', async () => {
      const element = jsx(Specialization, {
        areas: ['TypeScript', 'React', 'Node.js'],
        level: 'expert',
      });
      const result = await render(element);
      expect(result.text).toMatchSnapshot();
    });

    it('should match snapshot: single area no level', async () => {
      const element = jsx(Specialization, {
        areas: 'machine learning',
      });
      const result = await render(element);
      expect(result.text).toMatchSnapshot();
    });
  });
});
