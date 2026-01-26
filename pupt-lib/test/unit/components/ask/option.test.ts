import { describe, it, expect } from 'vitest';
import { Option } from '../../../../src/components/ask/Option';

describe('Option', () => {
  it('should return null when rendered', () => {
    // Option is a marker component - it doesn't render anything
    // The parent Select/MultiSelect component processes the options
    const result = Option({ value: 'test', children: 'Test Label' });
    expect(result).toBeNull();
  });

  it('should handle props without errors', () => {
    // Test with minimal props
    const result1 = Option({ value: 'minimal' });
    expect(result1).toBeNull();

    // Test with all props
    const result2 = Option({ value: 'full', children: 'Full Label' });
    expect(result2).toBeNull();
  });
});
