/**
 * Tests for branch coverage in Ask.Rating component
 */
import '../../../../components';

import { describe, expect,it } from 'vitest';

import { Ask } from '../../../../components/ask';
import { AskLabel } from '../../../../components/ask/Label';
import { jsx } from '../../../../src/jsx-runtime';
import { render } from '../../../../src/render';
import { createInputIterator } from '../../../../src/services/input-iterator';

describe('Ask.Rating branch coverage', () => {
  describe('label text rendering', () => {
    it('should render rating with label text when available', async () => {
      const element = jsx(Ask.Rating, {
        name: 'priority',
        label: 'Priority',
        min: 1,
        max: 5,
        labels: { 1: 'Very Low', 5: 'Very High' },
      });

      const result = await render(element, {
        inputs: { priority: 5 },
      });

      expect(result.text).toBe('5 (Very High)');
    });

    it('should render rating without label when not defined', async () => {
      const element = jsx(Ask.Rating, {
        name: 'priority',
        label: 'Priority',
        min: 1,
        max: 5,
        labels: { 1: 'Low', 5: 'High' },
      });

      const result = await render(element, {
        inputs: { priority: 3 },  // No label for 3
      });

      expect(result.text).toBe('3');
    });
  });

  describe('Label children', () => {
    it('should collect labels from Label children', async () => {
      const element = jsx(Ask.Rating, {
        name: 'satisfaction',
        label: 'Satisfaction',
        min: 1,
        max: 5,
        children: [
          jsx(AskLabel, { value: 1, children: 'Very Unsatisfied' }),
          jsx(AskLabel, { value: 3, children: 'Neutral' }),
          jsx(AskLabel, { value: 5, children: 'Very Satisfied' }),
        ],
      });

      const iterator = createInputIterator(element);
      await iterator.start();

      const req = iterator.current();
      expect(req!.labels).toEqual({
        1: 'Very Unsatisfied',
        3: 'Neutral',
        5: 'Very Satisfied',
      });
    });

    it('should handle string value in Label', async () => {
      const element = jsx(Ask.Rating, {
        name: 'score',
        label: 'Score',
        children: [
          jsx(AskLabel, { value: '1', children: 'One' }),
          jsx(AskLabel, { value: '2', children: 'Two' }),
        ],
      });

      const iterator = createInputIterator(element);
      await iterator.start();

      const req = iterator.current();
      expect(req!.labels![1]).toBe('One');
      expect(req!.labels![2]).toBe('Two');
    });

    it('should handle numeric children in Label', async () => {
      const element = jsx(Ask.Rating, {
        name: 'level',
        label: 'Level',
        children: [
          jsx(AskLabel, { value: 1, children: 100 }),
        ],
      });

      const iterator = createInputIterator(element);
      await iterator.start();

      const req = iterator.current();
      expect(req!.labels![1]).toBe('100');
    });

    it('should handle array children in Label', async () => {
      const element = jsx(Ask.Rating, {
        name: 'quality',
        label: 'Quality',
        children: [
          jsx(AskLabel, { value: 5, children: ['Very', ' ', 'Good'] }),
        ],
      });

      const iterator = createInputIterator(element);
      await iterator.start();

      const req = iterator.current();
      expect(req!.labels![5]).toBe('Very Good');
    });

    it('should skip Label with missing value', async () => {
      const element = jsx(Ask.Rating, {
        name: 'score',
        label: 'Score',
        children: [
          jsx(AskLabel, { children: 'No Value' } as { value: number; children: string }),
          jsx(AskLabel, { value: 1, children: 'Has Value' }),
        ],
      });

      const iterator = createInputIterator(element);
      await iterator.start();

      const req = iterator.current();
      expect(req!.labels![1]).toBe('Has Value');
      expect(Object.keys(req!.labels!)).toHaveLength(1);
    });

    it('should skip Label with empty children', async () => {
      const element = jsx(Ask.Rating, {
        name: 'score',
        label: 'Score',
        children: [
          jsx(AskLabel, { value: 1 }),  // No children
          jsx(AskLabel, { value: 2, children: 'Valid' }),
        ],
      });

      const iterator = createInputIterator(element);
      await iterator.start();

      const req = iterator.current();
      expect(req!.labels![2]).toBe('Valid');
      expect(req!.labels![1]).toBeUndefined();
    });

    it('should handle single Label child (not array)', async () => {
      const element = jsx(Ask.Rating, {
        name: 'single',
        label: 'Single',
        children: jsx(AskLabel, { value: 5, children: 'Max' }),
      });

      const iterator = createInputIterator(element);
      await iterator.start();

      const req = iterator.current();
      expect(req!.labels![5]).toBe('Max');
    });

    it('should skip non-Label children', async () => {
      const element = jsx(Ask.Rating, {
        name: 'mixed',
        label: 'Mixed',
        children: [
          'text',
          123,
          null,
          jsx(AskLabel, { value: 1, children: 'One' }),
        ],
      });

      const iterator = createInputIterator(element);
      await iterator.start();

      const req = iterator.current();
      expect(Object.keys(req!.labels!)).toHaveLength(1);
    });
  });

  describe('prop labels override child labels', () => {
    it('should override child labels with prop labels', async () => {
      const element = jsx(Ask.Rating, {
        name: 'priority',
        label: 'Priority',
        labels: { 1: 'Prop Low' },
        children: [
          jsx(AskLabel, { value: 1, children: 'Child Low' }),
          jsx(AskLabel, { value: 5, children: 'Child High' }),
        ],
      });

      const iterator = createInputIterator(element);
      await iterator.start();

      const req = iterator.current();
      // Prop label overrides child label
      expect(req!.labels![1]).toBe('Prop Low');
      // Child label without override
      expect(req!.labels![5]).toBe('Child High');
    });
  });

  describe('default value rendering', () => {
    it('should render default value when no input', async () => {
      const element = jsx(Ask.Rating, {
        name: 'priority',
        label: 'Priority',
        default: 3,
      });

      const result = await render(element);

      expect(result.text).toBe('3');
    });

    it('should render placeholder when no value or default', async () => {
      const element = jsx(Ask.Rating, {
        name: 'priority',
        label: 'Priority',
      });

      const result = await render(element);

      expect(result.text).toBe('{priority}');
    });
  });
});
