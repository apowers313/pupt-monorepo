import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/render';
import { jsx, Fragment } from '../../../../src/jsx-runtime';
import { Steps, Step } from '../../../../components/reasoning';

describe('Steps', () => {
  it('should render numbered steps', async () => {
    const element = jsx(Steps, {
      children: [
        jsx(Step, { number: 1, children: 'Parse input' }),
        jsx(Step, { number: 2, children: 'Validate data' }),
        jsx(Step, { number: 3, children: 'Process result' }),
      ],
    });

    const result = await render(element);
    expect(result.text).toContain('1.');
    expect(result.text).toContain('Parse input');
    expect(result.text).toContain('2.');
    expect(result.text).toContain('3.');
  });

  it('should auto-number if not provided', async () => {
    const element = jsx(Steps, {
      children: [
        jsx(Step, { children: 'First' }),
        jsx(Step, { children: 'Second' }),
      ],
    });

    const result = await render(element);
    expect(result.text).toMatch(/1\..*First/s);
    expect(result.text).toMatch(/2\..*Second/s);
  });

  it('should find Step children through Fragments', async () => {
    const element = jsx(Steps, {
      children: jsx(Fragment, {
        children: [
          jsx(Step, { children: 'First step' }),
          jsx(Step, { children: 'Second step' }),
        ],
      }),
    });

    const result = await render(element);
    expect(result.text).toMatch(/1\..*First step/s);
    expect(result.text).toMatch(/2\..*Second step/s);
  });
});
