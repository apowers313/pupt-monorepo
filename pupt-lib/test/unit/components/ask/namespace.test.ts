import { describe, it, expect } from 'vitest';
import { Ask, AskOption, AskLabel } from '../../../../src/components/ask';
import { render } from '../../../../src/render';
import { jsx } from '../../../../src/jsx-runtime/index';
import { createInputIterator } from '../../../../src/services/input-iterator';

describe('Ask namespace exports', () => {
  it('should export Option on the Ask namespace', () => {
    expect(Ask.Option).toBeDefined();
    expect(Ask.Option).toBe(AskOption);
  });

  it('should export Label on the Ask namespace', () => {
    expect(Ask.Label).toBeDefined();
    expect(Ask.Label).toBe(AskLabel);
  });

  it('should work with Ask.Option in JSX', async () => {
    const element = jsx(Ask.Select, {
      name: 'framework',
      label: 'Choose framework',
      children: [
        jsx(Ask.Option, { value: 'react', children: 'React' }),
        jsx(Ask.Option, { value: 'vue', children: 'Vue' }),
      ],
    });

    const iterator = createInputIterator(element);
    await iterator.start();

    const req = iterator.current();
    expect(req).not.toBeNull();
    expect(req!.options).toHaveLength(2);
    expect(req!.options![0]).toEqual({ value: 'react', label: 'React', text: 'React' });
    expect(req!.options![1]).toEqual({ value: 'vue', label: 'Vue', text: 'Vue' });
  });

  it('should render Ask.Option children when selected', async () => {
    const element = jsx(Ask.Select, {
      name: 'priority',
      label: 'Priority level',
      children: [
        jsx(Ask.Option, { value: 'high', children: 'high priority' }),
        jsx(Ask.Option, { value: 'low', children: 'low priority' }),
      ],
    });

    const result = await render(element, {
      inputs: { priority: 'high' },
    });

    expect(result.text).toBe('high priority');
  });

  it('should work with Ask.Label in JSX', async () => {
    // AskLabel is a marker component that groups options
    const element = jsx(Ask.Select, {
      name: 'choice',
      label: 'Pick one',
      children: [
        jsx(Ask.Label, {
          label: 'Group A',
          children: [
            jsx(Ask.Option, { value: 'a1', children: 'Option A1' }),
            jsx(Ask.Option, { value: 'a2', children: 'Option A2' }),
          ],
        }),
      ],
    });

    // Just verify it doesn't throw
    const iterator = createInputIterator(element);
    await iterator.start();

    const req = iterator.current();
    expect(req).not.toBeNull();
  });

  describe('all Ask namespace properties', () => {
    it('should have all expected components', () => {
      const expectedComponents = [
        'Text',
        'Number',
        'Select',
        'Confirm',
        'Editor',
        'MultiSelect',
        'File',
        'Path',
        'Date',
        'Secret',
        'Choice',
        'Rating',
        'ReviewFile',
        'Option',
        'Label',
      ];

      for (const name of expectedComponents) {
        expect(Ask[name as keyof typeof Ask], `Ask.${name} should be defined`).toBeDefined();
      }
    });
  });
});
