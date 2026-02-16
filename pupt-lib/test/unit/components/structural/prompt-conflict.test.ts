import { describe, expect,it } from 'vitest';

import { ChainOfThought } from '../../../../components/reasoning/ChainOfThought';
import { Format } from '../../../../components/structural/Format';
import { Prompt } from '../../../../components/structural/Prompt';
import { Task } from '../../../../components/structural/Task';
import { jsx } from '../../../../src/jsx-runtime';
import { render } from '../../../../src/render';

describe('Prompt Format/ChainOfThought conflict detection', () => {
  it('should warn when Format strict and ChainOfThought showReasoning are both active', async () => {
    const element = jsx(Prompt, {
      name: 'test',
      children: [
        jsx(Task, { children: 'Do something' }),
        jsx(Format, { strict: true, children: null }),
        jsx(ChainOfThought, {}),
      ],
    });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.errors?.some(e => e.code === 'warn_conflicting_instructions')).toBe(true);
  });

  it('should not warn when ChainOfThought has showReasoning={false}', async () => {
    const element = jsx(Prompt, {
      name: 'test',
      children: [
        jsx(Task, { children: 'Do something' }),
        jsx(Format, { strict: true, children: null }),
        jsx(ChainOfThought, { showReasoning: false }),
      ],
    });
    const result = await render(element);
    expect(result.errors?.some(e => e.code === 'warn_conflicting_instructions')).toBeFalsy();
  });

  it('should not warn when Format does not have strict', async () => {
    const element = jsx(Prompt, {
      name: 'test',
      children: [
        jsx(Task, { children: 'Do something' }),
        jsx(Format, { children: null }),
        jsx(ChainOfThought, {}),
      ],
    });
    const result = await render(element);
    expect(result.errors?.some(e => e.code === 'warn_conflicting_instructions')).toBeFalsy();
  });

  it('should be suppressible via ignoreWarnings', async () => {
    const element = jsx(Prompt, {
      name: 'test',
      children: [
        jsx(Task, { children: 'Do something' }),
        jsx(Format, { strict: true, children: null }),
        jsx(ChainOfThought, {}),
      ],
    });
    const result = await render(element, {
      ignoreWarnings: ['warn_conflicting_instructions'],
    });
    expect(result.errors?.some(e => e.code === 'warn_conflicting_instructions')).toBeFalsy();
  });

  it('should promote conflict warning to error with throwOnWarnings', async () => {
    const element = jsx(Prompt, {
      name: 'test',
      children: [
        jsx(Task, { children: 'Do something' }),
        jsx(Format, { strict: true, children: null }),
        jsx(ChainOfThought, {}),
      ],
    });
    const result = await render(element, { throwOnWarnings: true });
    expect(result.ok).toBe(false);
    expect(result.errors.some(e => e.code === 'warn_conflicting_instructions')).toBe(true);
  });
});
