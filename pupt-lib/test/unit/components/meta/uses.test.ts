import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/render';
import { jsx } from '../../../../src/jsx-runtime';
import { Uses } from '../../../../src/components/meta/Uses';

describe('Uses', () => {
  it('should render as empty (meta component)', async () => {
    const element = jsx(Uses, {
      component: 'SomeComponent',
      from: 'some-lib',
    });

    const result = await render(element);
    // Uses is a meta component that doesn't render anything
    // Note: A console warning will be logged since the Babel plugin didn't transform it
    expect(result.text).toBe('');
  });

  it('should accept optional as prop', async () => {
    const element = jsx(Uses, {
      component: 'SomeComponent',
      as: 'Alias',
      from: 'some-lib',
    });

    const result = await render(element);
    // Still renders as empty
    expect(result.text).toBe('');
  });

  it('should accept default import syntax', async () => {
    const element = jsx(Uses, {
      default: 'DefaultComponent',
      from: 'some-lib',
    });

    const result = await render(element);
    expect(result.text).toBe('');
  });
});
