/**
 * Tests for branch coverage in If component
 */
import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/render';
import { jsx } from '../../../../src/jsx-runtime';
import { If } from '../../../../src/components/control/If';
import '../../../../src/components';

describe('If branch coverage', () => {
  describe('non-boolean, non-string when values', () => {
    it('should produce validation error for number when value', () => {
      const element = jsx(If, {
        when: 1 as unknown as boolean,
        children: 'Visible',
      });

      const result = render(element);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0].component).toBe('If');
        expect(result.errors[0].prop).toBe('when');
      }
    });

    it('should produce validation error for zero when value', () => {
      const element = jsx(If, {
        when: 0 as unknown as boolean,
        children: 'Hidden',
      });

      const result = render(element);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0].component).toBe('If');
      }
    });

    it('should produce validation error for object when value', () => {
      const element = jsx(If, {
        when: { truthy: true } as unknown as boolean,
        children: 'Visible',
      });

      const result = render(element);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0].component).toBe('If');
      }
    });

    it('should produce validation error for null when value', () => {
      const element = jsx(If, {
        when: null as unknown as boolean,
        children: 'Hidden',
      });

      const result = render(element);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0].component).toBe('If');
      }
    });

    it('should produce validation error for undefined when value', () => {
      const element = jsx(If, {
        when: undefined as unknown as boolean,
        children: 'Hidden',
      });

      const result = render(element);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0].component).toBe('If');
      }
    });
  });

  describe('children edge cases', () => {
    it('should handle undefined children when condition is true', () => {
      const element = jsx(If, {
        when: true,
        // No children provided
      });

      const result = render(element);
      expect(result.text).toBe('');
    });

    it('should handle null children when condition is true', () => {
      const element = jsx(If, {
        when: true,
        children: null,
      });

      const result = render(element);
      expect(result.text).toBe('');
    });
  });
});
