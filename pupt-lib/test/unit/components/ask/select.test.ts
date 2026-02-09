import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/render';
import { jsx } from '../../../../src/jsx-runtime';
import { Ask, AskOption } from '../../../../components/ask';
import { createInputIterator } from '../../../../src/services/input-iterator';
import '../../../../components';

describe('Ask.Select', () => {
  describe('options prop', () => {
    it('should accept options as prop', async () => {
      const element = jsx(Ask.Select, {
        name: 'framework',
        label: 'Choose framework',
        options: [
          { value: 'react', label: 'React' },
          { value: 'vue', label: 'Vue' },
        ],
      });

      const result = await render(element, {
        inputs: { framework: 'vue' },
      });

      // Should render the label (Vue), not the value (vue)
      expect(result.text).toBe('Vue');
    });

    it('should render option text when specified', async () => {
      const element = jsx(Ask.Select, {
        name: 'priority',
        label: 'Priority',
        options: [
          { value: 'high', label: 'High (urgent)', text: 'high priority' },
          { value: 'low', label: 'Low', text: 'low priority' },
        ],
      });

      const result = await render(element, {
        inputs: { priority: 'high' },
      });

      expect(result.text).toBe('high priority');
    });
  });

  describe('AskOption children', () => {
    it('should collect options from AskOption children', async () => {
      const element = jsx(Ask.Select, {
        name: 'framework',
        label: 'Choose framework',
        children: [
          jsx(AskOption, { value: 'react', children: 'React' }),
          jsx(AskOption, { value: 'vue', children: 'Vue' }),
          jsx(AskOption, { value: 'angular', children: 'Angular' }),
        ],
      });

      const iterator = createInputIterator(element);
      await iterator.start();

      const req = iterator.current();
      expect(req).not.toBeNull();
      expect(req!.options).toHaveLength(3);
      expect(req!.options![0]).toEqual({ value: 'react', label: 'React', text: 'React' });
      expect(req!.options![1]).toEqual({ value: 'vue', label: 'Vue', text: 'Vue' });
      expect(req!.options![2]).toEqual({ value: 'angular', label: 'Angular', text: 'Angular' });
    });

    it('should use AskOption label when provided', async () => {
      const element = jsx(Ask.Select, {
        name: 'priority',
        label: 'Priority level',
        children: [
          jsx(AskOption, { value: 'high', label: 'High (urgent)', children: 'high priority' }),
          jsx(AskOption, { value: 'low', label: 'Low (can wait)', children: 'low priority' }),
        ],
      });

      const iterator = createInputIterator(element);
      await iterator.start();

      const req = iterator.current();
      expect(req!.options![0]).toEqual({
        value: 'high',
        label: 'High (urgent)',
        text: 'high priority',
      });
      expect(req!.options![1]).toEqual({
        value: 'low',
        label: 'Low (can wait)',
        text: 'low priority',
      });
    });

    it('should render AskOption children text when selected', async () => {
      const element = jsx(Ask.Select, {
        name: 'priority',
        label: 'Priority level',
        children: [
          jsx(AskOption, { value: 'high', label: 'High (urgent)', children: 'high priority' }),
          jsx(AskOption, { value: 'low', label: 'Low (can wait)', children: 'low priority' }),
        ],
      });

      const result = await render(element, {
        inputs: { priority: 'high' },
      });

      expect(result.text).toBe('high priority');
    });

    it('should fall back to value when no children or label', async () => {
      const element = jsx(Ask.Select, {
        name: 'color',
        label: 'Pick color',
        children: [
          jsx(AskOption, { value: 'red' }),
          jsx(AskOption, { value: 'blue' }),
        ],
      });

      const iterator = createInputIterator(element);
      await iterator.start();

      const req = iterator.current();
      expect(req!.options![0]).toEqual({ value: 'red', label: 'red', text: 'red' });
    });

    it('should ignore non-AskOption children', async () => {
      const element = jsx(Ask.Select, {
        name: 'color',
        label: 'Pick color',
        children: [
          'Some text that should be ignored',
          jsx(AskOption, { value: 'red', children: 'Red' }),
          null,
          jsx(AskOption, { value: 'blue', children: 'Blue' }),
        ],
      });

      const iterator = createInputIterator(element);
      await iterator.start();

      const req = iterator.current();
      expect(req!.options).toHaveLength(2);
    });
  });

  describe('combined options', () => {
    it('should merge AskOption children with options prop (children first)', async () => {
      const element = jsx(Ask.Select, {
        name: 'choice',
        label: 'Make a choice',
        options: [
          { value: 'from-prop', label: 'From Prop' },
        ],
        children: [
          jsx(AskOption, { value: 'from-child', children: 'From Child' }),
        ],
      });

      const iterator = createInputIterator(element);
      await iterator.start();

      const req = iterator.current();
      expect(req!.options).toHaveLength(2);
      expect(req!.options![0].value).toBe('from-child');
      expect(req!.options![1].value).toBe('from-prop');
    });
  });

  describe('rendering', () => {
    it('should render selected value', async () => {
      const element = jsx(Ask.Select, {
        name: 'framework',
        label: 'Choose framework',
        children: [
          jsx(AskOption, { value: 'react', children: 'React' }),
          jsx(AskOption, { value: 'vue', children: 'Vue' }),
        ],
      });

      const result = await render(element, {
        inputs: { framework: 'react' },
      });

      expect(result.text).toBe('React');
    });

    it('should render placeholder when no input provided', async () => {
      const element = jsx(Ask.Select, {
        name: 'color',
        label: 'Pick a color',
        options: [
          { value: 'red', label: 'Red' },
          { value: 'blue', label: 'Blue' },
        ],
      });

      const result = await render(element);
      expect(result.text).toContain('{color}');
    });

    it('should render only placeholder without label when no input', async () => {
      const element = jsx(Ask.Select, {
        name: 'country',
        label: 'Select your country',
        options: [
          { value: 'us', label: 'United States' },
          { value: 'uk', label: 'United Kingdom' },
        ],
      });

      const result = await render(element);
      // Label is metadata for CLI, not rendered in output
      expect(result.text).toBe('{country}');
    });

    it('should render default value when no input provided', async () => {
      const element = jsx(Ask.Select, {
        name: 'framework',
        label: 'Choose framework',
        default: 'react',
        children: [
          jsx(AskOption, { value: 'react', children: 'React' }),
          jsx(AskOption, { value: 'vue', children: 'Vue' }),
        ],
      });

      const result = await render(element);
      expect(result.text).toBe('React');
    });
  });
});

describe('Ask.Number', () => {
  it('should render placeholder when no input provided', async () => {
    const element = jsx(Ask.Number, {
      name: 'age',
      label: 'Enter your age',
    });

    const result = await render(element);
    expect(result.text).toContain('{age}');
  });

  it('should render input value when provided', async () => {
    const element = jsx(Ask.Number, {
      name: 'age',
      label: 'Enter your age',
    });

    const result = await render(element, {
      inputs: { age: 25 },
    });

    expect(result.text).toContain('25');
    expect(result.text).not.toContain('{age}');
  });
});

describe('Ask.Confirm', () => {
  it('should render default false when no input provided', async () => {
    const element = jsx(Ask.Confirm, {
      name: 'proceed',
      label: 'Do you want to proceed?',
    });

    const result = await render(element);
    expect(result.text).toContain('No');
  });

  it('should render Yes when true is provided', async () => {
    const element = jsx(Ask.Confirm, {
      name: 'proceed',
      label: 'Do you want to proceed?',
    });

    const result = await render(element, {
      inputs: { proceed: true },
    });

    expect(result.text).toContain('Yes');
  });

  it('should render No when false is provided', async () => {
    const element = jsx(Ask.Confirm, {
      name: 'proceed',
      label: 'Do you want to proceed?',
    });

    const result = await render(element, {
      inputs: { proceed: false },
    });

    expect(result.text).toContain('No');
  });
});
