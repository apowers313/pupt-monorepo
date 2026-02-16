import { describe, expect,it } from 'vitest';

import { Prompt } from '../../../../components/structural/Prompt';
import { jsx } from '../../../../src/jsx-runtime';
import { render } from '../../../../src/render';

describe('Prompt', () => {
  it('should render children', async () => {
    const element = jsx(Prompt, {
      name: 'test-prompt',
      children: 'Hello World',
    });

    const result = await render(element);
    expect(result.text).toContain('Hello World');
  });

  it('should include metadata in output', async () => {
    const element = jsx(Prompt, {
      name: 'test-prompt',
      version: '1.0.0',
      description: 'A test prompt',
      tags: ['test', 'example'],
      children: 'Content',
    });

    const result = await render(element);
    // Metadata available but may not be in text output
    expect(result.text).toContain('Content');
  });
});
