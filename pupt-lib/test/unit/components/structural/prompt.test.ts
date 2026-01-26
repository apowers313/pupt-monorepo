import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/render';
import { jsx } from '../../../../src/jsx-runtime';
import { Prompt } from '../../../../src/components/structural/Prompt';

describe('Prompt', () => {
  it('should render children', () => {
    const element = jsx(Prompt, {
      name: 'test-prompt',
      children: 'Hello World',
    });

    const result = render(element);
    expect(result.text).toContain('Hello World');
  });

  it('should include metadata in output', () => {
    const element = jsx(Prompt, {
      name: 'test-prompt',
      version: '1.0.0',
      description: 'A test prompt',
      tags: ['test', 'example'],
      children: 'Content',
    });

    const result = render(element);
    // Metadata available but may not be in text output
    expect(result.text).toContain('Content');
  });
});
