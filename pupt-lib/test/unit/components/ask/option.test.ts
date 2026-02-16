import { describe, expect,it } from 'vitest';

import { AskOption } from '../../../../components/ask/Option';
import { jsx } from '../../../../src/jsx-runtime/index';
import { render } from '../../../../src/render';

describe('AskOption', () => {
  it('should return null when rendered', async () => {
    // AskOption is a marker component - it doesn't render anything
    // The parent Select/MultiSelect component processes the options
    const element = jsx(AskOption, { value: 'test', children: 'Test Label' });
    const result = await render(element);
    expect(result.text).toBe('');
  });

  it('should handle props without errors', async () => {
    // Test with minimal props
    const element1 = jsx(AskOption, { value: 'minimal' });
    const result1 = await render(element1);
    expect(result1.text).toBe('');

    // Test with all props
    const element2 = jsx(AskOption, { value: 'full', children: 'Full Label' });
    const result2 = await render(element2);
    expect(result2.text).toBe('');
  });
});
