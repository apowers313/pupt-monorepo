import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/render';
import { jsx } from '../../../../src/jsx-runtime';
import { Example, Examples } from '../../../../src/components/examples';

describe('Example', () => {
  it('should render input/output pair', () => {
    const element = jsx(Example, {
      children: [
        jsx(Example.Input, { children: 'Calculate 15% of 200' }),
        jsx(Example.Output, { children: '30' }),
      ],
    });

    const result = render(element);
    expect(result.text).toContain('Calculate 15% of 200');
    expect(result.text).toContain('30');
  });
});

describe('Examples', () => {
  it('should render multiple examples', () => {
    const element = jsx(Examples, {
      children: [
        jsx(Example, {
          children: [
            jsx(Example.Input, { children: 'Input 1' }),
            jsx(Example.Output, { children: 'Output 1' }),
          ],
        }),
        jsx(Example, {
          children: [
            jsx(Example.Input, { children: 'Input 2' }),
            jsx(Example.Output, { children: 'Output 2' }),
          ],
        }),
      ],
    });

    const result = render(element);
    expect(result.text).toContain('Input 1');
    expect(result.text).toContain('Output 2');
  });
});
