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
    it('should coerce truthy number to true', () => {
      const element = jsx(If, {
        when: 1 as unknown as boolean,
        children: 'Visible',
      });

      const result = render(element);
      expect(result.text).toBe('Visible');
    });

    it('should coerce zero to false', () => {
      const element = jsx(If, {
        when: 0 as unknown as boolean,
        children: 'Hidden',
      });

      const result = render(element);
      expect(result.text).toBe('');
    });

    it('should coerce truthy object to true', () => {
      const element = jsx(If, {
        when: { truthy: true } as unknown as boolean,
        children: 'Visible',
      });

      const result = render(element);
      expect(result.text).toBe('Visible');
    });

    it('should coerce null to false', () => {
      const element = jsx(If, {
        when: null as unknown as boolean,
        children: 'Hidden',
      });

      const result = render(element);
      expect(result.text).toBe('');
    });

    it('should coerce undefined to false', () => {
      const element = jsx(If, {
        when: undefined as unknown as boolean,
        children: 'Hidden',
      });

      const result = render(element);
      expect(result.text).toBe('');
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
