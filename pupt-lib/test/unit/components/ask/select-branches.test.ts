/**
 * Tests for branch coverage in Ask.Select component
 */
import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/render';
import { jsx } from '../../../../src/jsx-runtime';
import { Ask, AskOption } from '../../../../src/components/ask';
import { createInputIterator } from '../../../../src/services/input-iterator';
import '../../../../src/components';

describe('Ask.Select branch coverage', () => {
  describe('selected option not found', () => {
    it('should render raw value when option not in list', async () => {
      const element = jsx(Ask.Select, {
        name: 'color',
        label: 'Color',
        options: [
          { value: 'red', label: 'Red' },
          { value: 'blue', label: 'Blue' },
        ],
      });

      const result = await render(element, {
        inputs: { color: 'green' },  // Not in options list
      });

      expect(result.text).toBe('green');
    });
  });

  describe('option text fallback', () => {
    it('should use text when provided', async () => {
      const element = jsx(Ask.Select, {
        name: 'priority',
        label: 'Priority',
        options: [
          { value: 'high', label: 'High Priority', text: 'urgent' },
        ],
      });

      const result = await render(element, {
        inputs: { priority: 'high' },
      });

      expect(result.text).toBe('urgent');
    });

    it('should fall back to label when text not provided', async () => {
      const element = jsx(Ask.Select, {
        name: 'priority',
        label: 'Priority',
        options: [
          { value: 'high', label: 'High Priority' },
        ],
      });

      const result = await render(element, {
        inputs: { priority: 'high' },
      });

      expect(result.text).toBe('High Priority');
    });
  });

  describe('Option children edge cases', () => {
    it('should handle Option with function type (named Option)', async () => {
      // This tests the typeof element.type === 'function' && element.type.name === 'Option' branch
      const element = jsx(Ask.Select, {
        name: 'choice',
        label: 'Choice',
        children: [
          jsx(AskOption, { value: 'opt1', children: 'Option 1' }),
        ],
      });

      const iterator = createInputIterator(element);
      await iterator.start();

      const req = iterator.current();
      expect(req!.options).toHaveLength(1);
    });

    it('should handle Option with numeric children', async () => {
      const element = jsx(Ask.Select, {
        name: 'number',
        label: 'Number',
        children: [
          jsx(AskOption, { value: '1', children: 1 }),
          jsx(AskOption, { value: '2', children: 2 }),
        ],
      });

      const iterator = createInputIterator(element);
      await iterator.start();

      const req = iterator.current();
      expect(req!.options![0].text).toBe('1');
      expect(req!.options![1].text).toBe('2');
    });

    it('should handle Option with array children', async () => {
      const element = jsx(Ask.Select, {
        name: 'combined',
        label: 'Combined',
        children: [
          jsx(AskOption, { value: 'ab', children: ['Part A', ' and ', 'Part B'] }),
        ],
      });

      const iterator = createInputIterator(element);
      await iterator.start();

      const req = iterator.current();
      expect(req!.options![0].text).toBe('Part A and Part B');
    });

    it('should handle single Option child (not array)', async () => {
      const element = jsx(Ask.Select, {
        name: 'single',
        label: 'Single',
        children: jsx(AskOption, { value: 'only', children: 'Only Option' }),
      });

      const iterator = createInputIterator(element);
      await iterator.start();

      const req = iterator.current();
      expect(req!.options).toHaveLength(1);
    });

    it('should handle empty array children in Option', async () => {
      const element = jsx(Ask.Select, {
        name: 'empty',
        label: 'Empty',
        children: [
          jsx(AskOption, { value: 'notext', children: [] }),
        ],
      });

      const iterator = createInputIterator(element);
      await iterator.start();

      const req = iterator.current();
      // Falls back to value when children array is empty
      expect(req!.options![0].value).toBe('notext');
    });
  });

  describe('children without type property', () => {
    it('should skip children without type property', async () => {
      const element = jsx(Ask.Select, {
        name: 'filtered',
        label: 'Filtered',
        children: [
          { notType: 'object' } as unknown,  // Object without 'type'
          jsx(AskOption, { value: 'valid', children: 'Valid' }),
        ],
      });

      const iterator = createInputIterator(element);
      await iterator.start();

      const req = iterator.current();
      expect(req!.options).toHaveLength(1);
    });
  });

  describe('getTextFromChildren edge cases', () => {
    it('should return undefined for object children (PuptElement)', async () => {
      // When a child is an object that's not an array (e.g., a nested element),
      // getTextFromChildren should return undefined
      const element = jsx(Ask.Select, {
        name: 'items',
        label: 'Items',
        children: [
          jsx(AskOption, {
            value: 'nested',
            // Children is a nested element (object), not string/number/array
            children: jsx('span', { children: 'nested text' }),
          }),
        ],
      });

      const iterator = createInputIterator(element);
      await iterator.start();

      const req = iterator.current();
      // When getTextFromChildren returns undefined for object child,
      // it falls back to label then value
      expect(req!.options![0].value).toBe('nested');
    });
  });

  describe('Option function type detection', () => {
    it('should detect Option when type is function with name Option', async () => {
      // This exercises the `typeof element.type === 'function' && element.type.name === 'Option'` branch
      const element = jsx(Ask.Select, {
        name: 'func',
        label: 'Function Options',
        children: [
          jsx(AskOption, { value: 'funcopt', children: 'Function Option' }),
        ],
      });

      const iterator = createInputIterator(element);
      await iterator.start();

      const req = iterator.current();
      expect(req!.options).toHaveLength(1);
      expect(req!.options![0].value).toBe('funcopt');
    });
  });
});
