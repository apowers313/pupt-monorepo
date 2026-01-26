/**
 * Tests for branch coverage in Ask.MultiSelect component
 */
import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/render';
import { jsx } from '../../../../src/jsx-runtime';
import { Ask, Option } from '../../../../src/components/ask';
import { createInputIterator } from '../../../../src/services/input-iterator';
import '../../../../src/components';

describe('Ask.MultiSelect branch coverage', () => {
  describe('option text fallback', () => {
    it('should use option text field when available', () => {
      const element = jsx(Ask.MultiSelect, {
        name: 'features',
        label: 'Features',
        options: [
          { value: 'auth', label: 'Authentication', text: 'auth feature' },
          { value: 'api', label: 'API', text: 'api feature' },
        ],
      });

      const result = render(element, {
        inputs: { features: ['auth', 'api'] },
      });

      expect(result.text).toBe('auth feature, api feature');
    });

    it('should fall back to label when text not provided', () => {
      const element = jsx(Ask.MultiSelect, {
        name: 'features',
        label: 'Features',
        options: [
          { value: 'auth', label: 'Authentication' },
          { value: 'api', label: 'API' },
        ],
      });

      const result = render(element, {
        inputs: { features: ['auth'] },
      });

      expect(result.text).toBe('Authentication');
    });

    it('should fall back to value when option not found', () => {
      const element = jsx(Ask.MultiSelect, {
        name: 'features',
        label: 'Features',
        options: [
          { value: 'auth', label: 'Authentication' },
        ],
      });

      const result = render(element, {
        inputs: { features: ['auth', 'unknown'] },
      });

      expect(result.text).toBe('Authentication, unknown');
    });
  });

  describe('Option children with various props', () => {
    it('should handle Option with label prop', () => {
      const element = jsx(Ask.MultiSelect, {
        name: 'items',
        label: 'Items',
        children: [
          jsx(Option, { value: 'a', label: 'Item A' }),
        ],
      });

      const iterator = createInputIterator(element);
      iterator.start();

      const req = iterator.current();
      expect(req!.options![0].label).toBe('Item A');
    });

    it('should handle Option with children text', () => {
      const element = jsx(Ask.MultiSelect, {
        name: 'items',
        label: 'Items',
        children: [
          jsx(Option, { value: 'b', children: 'Item B Text' }),
        ],
      });

      const iterator = createInputIterator(element);
      iterator.start();

      const req = iterator.current();
      expect(req!.options![0].text).toBe('Item B Text');
    });

    it('should handle Option with numeric children', () => {
      const element = jsx(Ask.MultiSelect, {
        name: 'numbers',
        label: 'Numbers',
        children: [
          jsx(Option, { value: '1', children: 1 }),
          jsx(Option, { value: '2', children: 2 }),
        ],
      });

      const iterator = createInputIterator(element);
      iterator.start();

      const req = iterator.current();
      expect(req!.options![0].text).toBe('1');
      expect(req!.options![1].text).toBe('2');
    });

    it('should handle Option with array children', () => {
      const element = jsx(Ask.MultiSelect, {
        name: 'items',
        label: 'Items',
        children: [
          jsx(Option, { value: 'combined', children: ['Part 1', ' - ', 'Part 2'] }),
        ],
      });

      const iterator = createInputIterator(element);
      iterator.start();

      const req = iterator.current();
      expect(req!.options![0].text).toBe('Part 1 - Part 2');
    });

    it('should handle single child (not array)', () => {
      const element = jsx(Ask.MultiSelect, {
        name: 'single',
        label: 'Single',
        children: jsx(Option, { value: 'only', children: 'Only Option' }),
      });

      const iterator = createInputIterator(element);
      iterator.start();

      const req = iterator.current();
      expect(req!.options).toHaveLength(1);
    });

    it('should skip non-object children', () => {
      const element = jsx(Ask.MultiSelect, {
        name: 'mixed',
        label: 'Mixed',
        children: [
          'text node',
          123,
          null,
          undefined,
          jsx(Option, { value: 'real', children: 'Real Option' }),
        ],
      });

      const iterator = createInputIterator(element);
      iterator.start();

      const req = iterator.current();
      expect(req!.options).toHaveLength(1);
    });
  });

  describe('default value handling', () => {
    it('should render default value when no input', () => {
      const element = jsx(Ask.MultiSelect, {
        name: 'features',
        label: 'Features',
        default: ['auth', 'api'],
        options: [
          { value: 'auth', label: 'Auth' },
          { value: 'api', label: 'API' },
        ],
      });

      const result = render(element);

      expect(result.text).toBe('Auth, API');
    });

    it('should render placeholder when no value or default', () => {
      const element = jsx(Ask.MultiSelect, {
        name: 'features',
        label: 'Features',
        options: [{ value: 'auth', label: 'Auth' }],
      });

      const result = render(element);

      expect(result.text).toBe('{features}');
    });
  });

  describe('min/max constraints', () => {
    it('should pass min/max to requirement', () => {
      const element = jsx(Ask.MultiSelect, {
        name: 'tags',
        label: 'Tags',
        min: 1,
        max: 5,
        options: [
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
        ],
      });

      const iterator = createInputIterator(element);
      iterator.start();

      const req = iterator.current();
      expect(req!.min).toBe(1);
      expect(req!.max).toBe(5);
    });
  });

  describe('getTextFromChildren edge cases', () => {
    it('should return undefined for object children (PuptElement)', () => {
      // When a child is an object that's not an array (e.g., a nested element),
      // getTextFromChildren should return undefined
      const element = jsx(Ask.MultiSelect, {
        name: 'items',
        label: 'Items',
        children: [
          jsx(Option, {
            value: 'nested',
            // Children is a nested element (object), not string/number/array
            children: jsx('span', { children: 'nested text' }),
          }),
        ],
      });

      const iterator = createInputIterator(element);
      iterator.start();

      const req = iterator.current();
      // When getTextFromChildren returns undefined for object child,
      // it falls back to label then value
      expect(req!.options![0].value).toBe('nested');
    });
  });

  describe('Option function type detection', () => {
    it('should detect Option when type is function with name Option', () => {
      // Create an element where Option is passed as a function reference
      // This exercises the `typeof element.type === 'function' && element.type.name === 'Option'` branch
      const element = jsx(Ask.MultiSelect, {
        name: 'func',
        label: 'Function Options',
        children: [
          // This creates an element with type=Option (the function)
          jsx(Option, { value: 'funcopt', children: 'Function Option' }),
        ],
      });

      const iterator = createInputIterator(element);
      iterator.start();

      const req = iterator.current();
      expect(req!.options).toHaveLength(1);
      expect(req!.options![0].value).toBe('funcopt');
    });
  });
});
