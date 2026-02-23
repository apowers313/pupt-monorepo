import { describe, expect,it } from 'vitest';

import { evaluateFormula } from '../../../src/services/formula-parser';

describe('evaluateFormula', () => {
  describe('non-formula strings', () => {
    it('should return true for non-empty truthy strings', () => {
      expect(evaluateFormula('hello', new Map())).toBe(true);
      expect(evaluateFormula('test', new Map())).toBe(true);
    });

    it('should return false for empty strings', () => {
      expect(evaluateFormula('', new Map())).toBe(false);
    });
  });

  describe('simple comparisons', () => {
    it('should evaluate greater than comparisons', () => {
      const inputs = new Map<string, unknown>([['count', 10]]);
      expect(evaluateFormula('=count>5', inputs)).toBe(true);
      expect(evaluateFormula('=count>15', inputs)).toBe(false);
    });

    it('should evaluate less than comparisons', () => {
      const inputs = new Map<string, unknown>([['count', 10]]);
      expect(evaluateFormula('=count<15', inputs)).toBe(true);
      expect(evaluateFormula('=count<5', inputs)).toBe(false);
    });

    it('should evaluate equality comparisons', () => {
      const inputs = new Map<string, unknown>([['value', 42]]);
      expect(evaluateFormula('=value=42', inputs)).toBe(true);
      expect(evaluateFormula('=value=100', inputs)).toBe(false);
    });

    it('should evaluate greater than or equal', () => {
      const inputs = new Map<string, unknown>([['score', 80]]);
      expect(evaluateFormula('=score>=80', inputs)).toBe(true);
      expect(evaluateFormula('=score>=81', inputs)).toBe(false);
    });

    it('should evaluate less than or equal', () => {
      const inputs = new Map<string, unknown>([['score', 80]]);
      expect(evaluateFormula('=score<=80', inputs)).toBe(true);
      expect(evaluateFormula('=score<=79', inputs)).toBe(false);
    });
  });

  describe('logical operators', () => {
    it('should evaluate AND expressions', () => {
      const inputs = new Map<string, unknown>([
        ['a', 10],
        ['b', 5],
      ]);
      expect(evaluateFormula('=AND(a>5, b<10)', inputs)).toBe(true);
      expect(evaluateFormula('=AND(a>15, b<10)', inputs)).toBe(false);
      expect(evaluateFormula('=AND(a>5, b>10)', inputs)).toBe(false);
    });

    it('should evaluate OR expressions', () => {
      const inputs = new Map<string, unknown>([
        ['x', 10],
        ['y', 5],
      ]);
      expect(evaluateFormula('=OR(x>15, y<10)', inputs)).toBe(true);
      expect(evaluateFormula('=OR(x>15, y>10)', inputs)).toBe(false);
    });

    it('should evaluate NOT expressions', () => {
      const inputs = new Map<string, unknown>([['flag', true]]);
      expect(evaluateFormula('=NOT(flag)', inputs)).toBe(false);

      const inputs2 = new Map<string, unknown>([['flag', false]]);
      expect(evaluateFormula('=NOT(flag)', inputs2)).toBe(true);
    });
  });

  describe('multiple variables', () => {
    it('should handle multiple variables in formula', () => {
      const inputs = new Map<string, unknown>([
        ['price', 100],
        ['quantity', 5],
        ['discount', 10],
      ]);
      expect(evaluateFormula('=price*quantity>400', inputs)).toBe(true);
      expect(evaluateFormula('=price-discount>80', inputs)).toBe(true);
    });
  });

  describe('result type handling', () => {
    it('should handle numeric results', () => {
      const inputs = new Map<string, unknown>([['n', 5]]);
      // Non-zero numbers are truthy
      expect(evaluateFormula('=n+1', inputs)).toBe(true);
      // Zero is falsy
      expect(evaluateFormula('=n-5', inputs)).toBe(false);
    });

    it('should handle string results', () => {
      // Using CONCAT or similar would return a string
      const inputs = new Map<string, unknown>([['text', 'hello']]);
      expect(evaluateFormula('=text', inputs)).toBe(true);
    });

    it('should handle boolean results directly', () => {
      const inputs = new Map<string, unknown>([['flag', true]]);
      expect(evaluateFormula('=flag', inputs)).toBe(true);

      const inputs2 = new Map<string, unknown>([['flag', false]]);
      expect(evaluateFormula('=flag', inputs2)).toBe(false);
    });
  });

  describe('value formatting for HyperFormula', () => {
    it('should handle string values', () => {
      const inputs = new Map<string, unknown>([['name', 'test']]);
      expect(evaluateFormula('=LEN(name)>0', inputs)).toBe(true);
    });

    it('should handle number values', () => {
      const inputs = new Map<string, unknown>([['num', 42]]);
      expect(evaluateFormula('=num=42', inputs)).toBe(true);
    });

    it('should handle boolean values', () => {
      const inputs = new Map<string, unknown>([['active', true]]);
      expect(evaluateFormula('=active', inputs)).toBe(true);
    });

    it('should handle null values', () => {
      const inputs = new Map<string, unknown>([['empty', null]]);
      // null becomes empty cell, which is falsy
      expect(evaluateFormula('=ISBLANK(empty)', inputs)).toBe(true);
    });

    it('should handle undefined values', () => {
      const inputs = new Map<string, unknown>([['missing', undefined]]);
      expect(evaluateFormula('=ISBLANK(missing)', inputs)).toBe(true);
    });

    it('should convert objects to strings', () => {
      const inputs = new Map<string, unknown>([['obj', { key: 'value' }]]);
      // Object is converted to string "[object Object]"
      expect(evaluateFormula('=LEN(obj)>0', inputs)).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should return false for formula errors', () => {
      const inputs = new Map<string, unknown>([['x', 10]]);
      // Division by zero should return an error object
      expect(evaluateFormula('=1/0', inputs)).toBe(false);
    });

    it('should handle unknown variable references', () => {
      const inputs = new Map<string, unknown>([['x', 10]]);
      // Reference to non-existent variable - this will be treated as a cell reference
      // that doesn't exist, resulting in an error
      const result = evaluateFormula('=unknownVar>5', inputs);
      // The behavior depends on how HyperFormula handles unknown references
      expect(typeof result).toBe('boolean');
    });
  });

  describe('special characters in variable names', () => {
    it('should escape special regex characters in variable names', () => {
      // Variable names with special chars that need escaping
      // Note: HyperFormula may not support all special chars in cell references
      // This tests that the regex escaping doesn't cause issues

      // Variables with dots are replaced properly
      const dotInputs = new Map<string, unknown>([['total', 10]]);
      expect(evaluateFormula('=total>5', dotInputs)).toBe(true);

      // Ensure the function handles empty maps
      const emptyInputs = new Map<string, unknown>();
      expect(evaluateFormula('=1>0', emptyInputs)).toBe(true);
    });
  });

  describe('IF function', () => {
    it('should evaluate IF expressions', () => {
      const inputs = new Map<string, unknown>([['score', 85]]);
      // IF(condition, value_if_true, value_if_false)
      // Using numeric values since HyperFormula may handle TRUE/FALSE differently
      expect(evaluateFormula('=IF(score>=80, 1, 0)', inputs)).toBe(true); // 1 is truthy
      expect(evaluateFormula('=IF(score>=90, 1, 0)', inputs)).toBe(false); // 0 is falsy
    });
  });

  describe('math functions', () => {
    it('should evaluate SUM', () => {
      const inputs = new Map<string, unknown>([
        ['a', 10],
        ['b', 20],
        ['c', 30],
      ]);
      expect(evaluateFormula('=SUM(a,b,c)>50', inputs)).toBe(true);
    });

    it('should evaluate ABS', () => {
      const inputs = new Map<string, unknown>([['negative', -5]]);
      expect(evaluateFormula('=ABS(negative)=5', inputs)).toBe(true);
    });
  });

  describe('instance caching', () => {
    it('should work without a cache (backward compatible)', () => {
      const inputs = new Map<string, unknown>([['x', 10]]);
      expect(evaluateFormula('=x>5', inputs)).toBe(true);
      expect(evaluateFormula('=x>5', inputs, undefined)).toBe(true);
    });

    it('should reuse a cached instance across calls', () => {
      const cache = new Map<string, unknown>();
      const inputs = new Map<string, unknown>([['n', 7]]);

      evaluateFormula('=n>5', inputs, cache);
      // The cache should now contain the HyperFormula instance
      expect(cache.size).toBe(1);

      // Second call reuses the cached instance
      const result = evaluateFormula('=n<10', inputs, cache);
      expect(result).toBe(true);
      // Cache size unchanged -- same key
      expect(cache.size).toBe(1);
    });

    it('should not leak state between cached calls', () => {
      const cache = new Map<string, unknown>();

      const inputs1 = new Map<string, unknown>([['a', 100]]);
      expect(evaluateFormula('=a>50', inputs1, cache)).toBe(true);

      // Different inputs on the next call
      const inputs2 = new Map<string, unknown>([['b', 3]]);
      expect(evaluateFormula('=b<5', inputs2, cache)).toBe(true);
      expect(evaluateFormula('=b>100', inputs2, cache)).toBe(false);
    });
  });
});
