import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/render';
import { jsx } from '../../../../src/jsx-runtime';
import { Uses } from '../../../../src/components/meta/Uses';

describe('Uses', () => {
  it('should render as empty (meta component)', () => {
    const element = jsx(Uses, {
      prompt: 'some-prompt',
    });

    const result = render(element);
    // Uses is a meta component that doesn't render anything
    expect(result.text).toBe('');
  });

  it('should accept optional as prop', () => {
    const element = jsx(Uses, {
      prompt: 'some-prompt',
      as: 'alias',
    });

    const result = render(element);
    // Still renders as empty
    expect(result.text).toBe('');
  });

  it('should accept optional children', () => {
    const element = jsx(Uses, {
      prompt: 'some-prompt',
      children: 'This will be ignored',
    });

    const result = render(element);
    // Children are ignored for meta components
    expect(result.text).toBe('');
  });
});
