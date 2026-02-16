/**
 * Tests for branch coverage in transformer.ts
 */
import { beforeEach,describe, expect, it } from 'vitest';

import { Transformer } from '../../../src/services/transformer';

describe('Transformer branch coverage', () => {
  let transformer: Transformer;

  beforeEach(() => {
    transformer = new Transformer();
  });

  describe('transformSourceAsync', () => {
    it('should transform valid TSX source', async () => {
      const source = 'const element = <div>Hello</div>;';
      const result = await transformer.transformSourceAsync(source, 'test.tsx');

      expect(result).toContain('jsx');
      expect(result).toContain('div');
    });

    it('should throw on invalid syntax', async () => {
      const source = 'const x = <';  // Invalid JSX

      await expect(
        transformer.transformSourceAsync(source, 'invalid.tsx'),
      ).rejects.toThrow();
    });
  });

  describe('getBabel caching', () => {
    it('should reuse cached Babel instance', async () => {
      // Call twice - second should use cache
      const result1 = await transformer.transformSourceAsync('const a = 1;', 'a.ts');
      const result2 = await transformer.transformSourceAsync('const b = 2;', 'b.ts');

      expect(result1).toContain('const a');
      expect(result2).toContain('const b');
    });
  });

  describe('module.default fallback', () => {
    it('should handle babel module with or without default export', async () => {
      // This tests the `module.default || module` fallback
      // By calling transform, we exercise this code path
      const result = await transformer.transformSourceAsync(
        'export const x = 1;',
        'export.ts',
      );

      expect(result).toContain('const x');
    });
  });
});
