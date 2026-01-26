import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/render';
import { jsx } from '../../../../src/jsx-runtime';
import { Ask, Option } from '../../../../src/components/ask';
import { createInputIterator } from '../../../../src/services/input-iterator';
import '../../../../src/components';

describe('Ask.Select', () => {
  describe('options prop', () => {
    it('should accept options as prop', () => {
      const element = jsx(Ask.Select, {
        name: 'framework',
        label: 'Choose framework',
        options: [
          { value: 'react', label: 'React' },
          { value: 'vue', label: 'Vue' },
        ],
      });

      const result = render(element, {
        inputs: { framework: 'vue' },
      });

      // Should render the label (Vue), not the value (vue)
      expect(result.text).toBe('Vue');
    });

    it('should render option text when specified', () => {
      const element = jsx(Ask.Select, {
        name: 'priority',
        label: 'Priority',
        options: [
          { value: 'high', label: 'High (urgent)', text: 'high priority' },
          { value: 'low', label: 'Low', text: 'low priority' },
        ],
      });

      const result = render(element, {
        inputs: { priority: 'high' },
      });

      expect(result.text).toBe('high priority');
    });
  });

  describe('Option children', () => {
    it('should collect options from Option children', () => {
      const element = jsx(Ask.Select, {
        name: 'framework',
        label: 'Choose framework',
        children: [
          jsx(Option, { value: 'react', children: 'React' }),
          jsx(Option, { value: 'vue', children: 'Vue' }),
          jsx(Option, { value: 'angular', children: 'Angular' }),
        ],
      });

      const iterator = createInputIterator(element);
      iterator.start();

      const req = iterator.current();
      expect(req).not.toBeNull();
      expect(req!.options).toHaveLength(3);
      expect(req!.options![0]).toEqual({ value: 'react', label: 'React', text: 'React' });
      expect(req!.options![1]).toEqual({ value: 'vue', label: 'Vue', text: 'Vue' });
      expect(req!.options![2]).toEqual({ value: 'angular', label: 'Angular', text: 'Angular' });
    });

    it('should use Option label when provided', () => {
      const element = jsx(Ask.Select, {
        name: 'priority',
        label: 'Priority level',
        children: [
          jsx(Option, { value: 'high', label: 'High (urgent)', children: 'high priority' }),
          jsx(Option, { value: 'low', label: 'Low (can wait)', children: 'low priority' }),
        ],
      });

      const iterator = createInputIterator(element);
      iterator.start();

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

    it('should render Option children text when selected', () => {
      const element = jsx(Ask.Select, {
        name: 'priority',
        label: 'Priority level',
        children: [
          jsx(Option, { value: 'high', label: 'High (urgent)', children: 'high priority' }),
          jsx(Option, { value: 'low', label: 'Low (can wait)', children: 'low priority' }),
        ],
      });

      const result = render(element, {
        inputs: { priority: 'high' },
      });

      expect(result.text).toBe('high priority');
    });

    it('should fall back to value when no children or label', () => {
      const element = jsx(Ask.Select, {
        name: 'color',
        label: 'Pick color',
        children: [
          jsx(Option, { value: 'red' }),
          jsx(Option, { value: 'blue' }),
        ],
      });

      const iterator = createInputIterator(element);
      iterator.start();

      const req = iterator.current();
      expect(req!.options![0]).toEqual({ value: 'red', label: 'red', text: 'red' });
    });

    it('should ignore non-Option children', () => {
      const element = jsx(Ask.Select, {
        name: 'color',
        label: 'Pick color',
        children: [
          'Some text that should be ignored',
          jsx(Option, { value: 'red', children: 'Red' }),
          null,
          jsx(Option, { value: 'blue', children: 'Blue' }),
        ],
      });

      const iterator = createInputIterator(element);
      iterator.start();

      const req = iterator.current();
      expect(req!.options).toHaveLength(2);
    });
  });

  describe('combined options', () => {
    it('should merge Option children with options prop (children first)', () => {
      const element = jsx(Ask.Select, {
        name: 'choice',
        label: 'Make a choice',
        options: [
          { value: 'from-prop', label: 'From Prop' },
        ],
        children: [
          jsx(Option, { value: 'from-child', children: 'From Child' }),
        ],
      });

      const iterator = createInputIterator(element);
      iterator.start();

      const req = iterator.current();
      expect(req!.options).toHaveLength(2);
      expect(req!.options![0].value).toBe('from-child');
      expect(req!.options![1].value).toBe('from-prop');
    });
  });

  describe('rendering', () => {
    it('should render selected value', () => {
      const element = jsx(Ask.Select, {
        name: 'framework',
        label: 'Choose framework',
        children: [
          jsx(Option, { value: 'react', children: 'React' }),
          jsx(Option, { value: 'vue', children: 'Vue' }),
        ],
      });

      const result = render(element, {
        inputs: { framework: 'react' },
      });

      expect(result.text).toBe('React');
    });

    it('should render placeholder when no input provided', () => {
      const element = jsx(Ask.Select, {
        name: 'color',
        label: 'Pick a color',
        options: [
          { value: 'red', label: 'Red' },
          { value: 'blue', label: 'Blue' },
        ],
      });

      const result = render(element);
      expect(result.text).toContain('{color}');
    });

    it('should render only placeholder without label when no input', () => {
      const element = jsx(Ask.Select, {
        name: 'country',
        label: 'Select your country',
        options: [
          { value: 'us', label: 'United States' },
          { value: 'uk', label: 'United Kingdom' },
        ],
      });

      const result = render(element);
      // Label is metadata for CLI, not rendered in output
      expect(result.text).toBe('{country}');
    });

    it('should render default value when no input provided', () => {
      const element = jsx(Ask.Select, {
        name: 'framework',
        label: 'Choose framework',
        default: 'react',
        children: [
          jsx(Option, { value: 'react', children: 'React' }),
          jsx(Option, { value: 'vue', children: 'Vue' }),
        ],
      });

      const result = render(element);
      expect(result.text).toBe('React');
    });
  });
});

describe('Ask.Number', () => {
  it('should render placeholder when no input provided', () => {
    const element = jsx(Ask.Number, {
      name: 'age',
      label: 'Enter your age',
    });

    const result = render(element);
    expect(result.text).toContain('{age}');
  });

  it('should render input value when provided', () => {
    const element = jsx(Ask.Number, {
      name: 'age',
      label: 'Enter your age',
    });

    const result = render(element, {
      inputs: { age: 25 },
    });

    expect(result.text).toContain('25');
    expect(result.text).not.toContain('{age}');
  });
});

describe('Ask.Confirm', () => {
  it('should render placeholder when no input provided', () => {
    const element = jsx(Ask.Confirm, {
      name: 'proceed',
      label: 'Do you want to proceed?',
    });

    const result = render(element);
    expect(result.text).toContain('{proceed}');
  });

  it('should render Yes when true is provided', () => {
    const element = jsx(Ask.Confirm, {
      name: 'proceed',
      label: 'Do you want to proceed?',
    });

    const result = render(element, {
      inputs: { proceed: true },
    });

    expect(result.text).toContain('Yes');
  });

  it('should render No when false is provided', () => {
    const element = jsx(Ask.Confirm, {
      name: 'proceed',
      label: 'Do you want to proceed?',
    });

    const result = render(element, {
      inputs: { proceed: false },
    });

    expect(result.text).toContain('No');
  });
});
