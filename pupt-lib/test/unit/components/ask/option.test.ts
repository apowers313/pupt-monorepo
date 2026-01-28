import { describe, it, expect } from 'vitest';
import { AskOption } from '../../../../src/components/ask/Option';
import { render } from '../../../../src/render';
import { jsx } from '../../../../src/jsx-runtime/index';

describe('AskOption', () => {
  it('should return null when rendered', () => {
    // AskOption is a marker component - it doesn't render anything
    // The parent Select/MultiSelect component processes the options
    const element = jsx(AskOption, { value: 'test', children: 'Test Label' });
    const result = render(element);
    expect(result.text).toBe('');
  });

  it('should handle props without errors', () => {
    // Test with minimal props
    const element1 = jsx(AskOption, { value: 'minimal' });
    const result1 = render(element1);
    expect(result1.text).toBe('');

    // Test with all props
    const element2 = jsx(AskOption, { value: 'full', children: 'Full Label' });
    const result2 = render(element2);
    expect(result2.text).toBe('');
  });
});
