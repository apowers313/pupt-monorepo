/**
 * Tests for branch coverage in If component
 */
import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/render';
import { jsx } from '../../../../src/jsx-runtime';
import { If } from '../../../../components/control/If';
import '../../../../components';

describe('If branch coverage', () => {
  describe('non-boolean, non-string when values', () => {
    it('should produce validation error for number when value', async () => {
      const element = jsx(If, {
        when: 1 as unknown as boolean,
        children: 'Visible',
      });

      const result = await render(element);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0].component).toBe('If');
        expect(result.errors[0].prop).toBe('when');
      }
    });

    it('should produce validation error for zero when value', async () => {
      const element = jsx(If, {
        when: 0 as unknown as boolean,
        children: 'Hidden',
      });

      const result = await render(element);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0].component).toBe('If');
      }
    });

    it('should produce validation error for object when value', async () => {
      const element = jsx(If, {
        when: { truthy: true } as unknown as boolean,
        children: 'Visible',
      });

      const result = await render(element);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0].component).toBe('If');
      }
    });

    it('should produce validation error for null when value', async () => {
      const element = jsx(If, {
        when: null as unknown as boolean,
        children: 'Hidden',
      });

      const result = await render(element);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0].component).toBe('If');
      }
    });

    it('should not render when when value is undefined (optional, no error)', async () => {
      const element = jsx(If, {
        when: undefined as unknown as boolean,
        children: 'Hidden',
      });

      const result = await render(element);
      // when is optional (provider/notProvider are alternative conditions),
      // so undefined is valid. Boolean(undefined) === false, so no rendering.
      expect(result.ok).toBe(true);
      expect(result.text).toBe('');
    });
  });

  describe('children edge cases', () => {
    it('should handle undefined children when condition is true', async () => {
      const element = jsx(If, {
        when: true,
        // No children provided
      });

      const result = await render(element);
      expect(result.text).toBe('');
    });

    it('should handle null children when condition is true', async () => {
      const element = jsx(If, {
        when: true,
        children: null,
      });

      const result = await render(element);
      expect(result.text).toBe('');
    });
  });
});
