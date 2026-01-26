import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/render';
import { jsx } from '../../../../src/jsx-runtime';
import { Ask, Option, Label } from '../../../../src/components/ask';
import { createInputIterator } from '../../../../src/services/input-iterator';
import '../../../../src/components';

describe('Ask.Editor', () => {
  it('should render placeholder when no input provided', () => {
    const element = jsx(Ask.Editor, {
      name: 'code',
      label: 'Paste your code',
      language: 'typescript',
    });

    const result = render(element);
    expect(result.text).toBe('{code}');
  });

  it('should render input value when provided', () => {
    const element = jsx(Ask.Editor, {
      name: 'code',
      label: 'Paste your code',
    });

    const result = render(element, {
      inputs: { code: 'const x = 1;' },
    });

    expect(result.text).toBe('const x = 1;');
  });

  it('should include language in requirement', () => {
    const element = jsx(Ask.Editor, {
      name: 'code',
      label: 'Paste code',
      language: 'python',
    });

    const iterator = createInputIterator(element);
    iterator.start();
    const req = iterator.current();

    expect(req?.language).toBe('python');
  });
});

describe('Ask.MultiSelect', () => {
  it('should render comma-separated values', () => {
    const element = jsx(Ask.MultiSelect, {
      name: 'features',
      label: 'Select features',
      children: [
        jsx(Option, { value: 'auth', children: 'Authentication' }),
        jsx(Option, { value: 'api', children: 'API' }),
        jsx(Option, { value: 'db', children: 'Database' }),
      ],
    });

    const result = render(element, {
      inputs: { features: ['auth', 'db'] },
    });

    expect(result.text).toBe('Authentication, Database');
  });

  it('should collect options from children', () => {
    const element = jsx(Ask.MultiSelect, {
      name: 'features',
      label: 'Select features',
      children: [
        jsx(Option, { value: 'a', children: 'Option A' }),
        jsx(Option, { value: 'b', children: 'Option B' }),
      ],
    });

    const iterator = createInputIterator(element);
    iterator.start();
    const req = iterator.current();

    expect(req?.type).toBe('multiselect');
    expect(req?.options).toHaveLength(2);
  });

  it('should support min/max constraints', () => {
    const element = jsx(Ask.MultiSelect, {
      name: 'features',
      label: 'Select features',
      min: 1,
      max: 3,
      options: [
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B' },
      ],
    });

    const iterator = createInputIterator(element);
    iterator.start();
    const req = iterator.current();

    expect(req?.min).toBe(1);
    expect(req?.max).toBe(3);
  });
});

describe('Ask.File', () => {
  it('should render placeholder when no input', () => {
    const element = jsx(Ask.File, {
      name: 'config',
      label: 'Config file',
    });

    const result = render(element);
    expect(result.text).toBe('{config}');
  });

  it('should render file path when provided', () => {
    const element = jsx(Ask.File, {
      name: 'config',
      label: 'Config file',
    });

    const result = render(element, {
      inputs: { config: '/path/to/config.json' },
    });

    expect(result.text).toBe('/path/to/config.json');
  });

  it('should include file-specific properties in requirement', () => {
    const element = jsx(Ask.File, {
      name: 'source',
      label: 'Source files',
      extensions: ['.ts', '.tsx'],
      multiple: true,
      mustExist: true,
    });

    const iterator = createInputIterator(element);
    iterator.start();
    const req = iterator.current();

    expect(req?.type).toBe('file');
    expect(req?.extensions).toEqual(['.ts', '.tsx']);
    expect(req?.multiple).toBe(true);
    expect(req?.mustExist).toBe(true);
  });
});

describe('Ask.Path', () => {
  it('should render path when provided', () => {
    const element = jsx(Ask.Path, {
      name: 'output',
      label: 'Output directory',
    });

    const result = render(element, {
      inputs: { output: '/home/user/output' },
    });

    expect(result.text).toBe('/home/user/output');
  });

  it('should include path-specific properties', () => {
    const element = jsx(Ask.Path, {
      name: 'dir',
      label: 'Directory',
      mustExist: true,
      mustBeDirectory: true,
    });

    const iterator = createInputIterator(element);
    iterator.start();
    const req = iterator.current();

    expect(req?.type).toBe('path');
    expect(req?.mustExist).toBe(true);
    expect(req?.mustBeDirectory).toBe(true);
  });
});

describe('Ask.Date', () => {
  it('should render date when provided', () => {
    const element = jsx(Ask.Date, {
      name: 'deadline',
      label: 'Deadline',
    });

    const result = render(element, {
      inputs: { deadline: '2024-12-31' },
    });

    expect(result.text).toBe('2024-12-31');
  });

  it('should include date-specific properties', () => {
    const element = jsx(Ask.Date, {
      name: 'deadline',
      label: 'Deadline',
      includeTime: true,
      minDate: 'today',
    });

    const iterator = createInputIterator(element);
    iterator.start();
    const req = iterator.current();

    expect(req?.type).toBe('date');
    expect(req?.includeTime).toBe(true);
    expect(req?.minDate).toBe('today');
  });
});

describe('Ask.Secret', () => {
  it('should render value when provided', () => {
    const element = jsx(Ask.Secret, {
      name: 'apiKey',
      label: 'API Key',
    });

    const result = render(element, {
      inputs: { apiKey: 'sk-1234' },
    });

    expect(result.text).toBe('sk-1234');
  });

  it('should mark as masked in requirement', () => {
    const element = jsx(Ask.Secret, {
      name: 'password',
      label: 'Password',
    });

    const iterator = createInputIterator(element);
    iterator.start();
    const req = iterator.current();

    expect(req?.type).toBe('secret');
    expect(req?.masked).toBe(true);
  });
});

describe('Ask.Choice', () => {
  it('should render selected option label', () => {
    const element = jsx(Ask.Choice, {
      name: 'approach',
      label: 'Which approach?',
      options: [
        { value: 'refactor', label: 'Refactor code' },
        { value: 'rewrite', label: 'Rewrite from scratch' },
      ],
    });

    const result = render(element, {
      inputs: { approach: 'refactor' },
    });

    expect(result.text).toBe('Refactor code');
  });

  it('should have exactly 2 options', () => {
    const element = jsx(Ask.Choice, {
      name: 'choice',
      label: 'Choose',
      options: [
        { value: 'a', label: 'Option A' },
        { value: 'b', label: 'Option B' },
      ],
    });

    const iterator = createInputIterator(element);
    iterator.start();
    const req = iterator.current();

    expect(req?.options).toHaveLength(2);
  });
});

describe('Ask.Rating', () => {
  it('should render rating value', () => {
    const element = jsx(Ask.Rating, {
      name: 'priority',
      label: 'Priority',
      min: 1,
      max: 5,
    });

    const result = render(element, {
      inputs: { priority: 3 },
    });

    expect(result.text).toBe('3');
  });

  it('should render rating with label when available', () => {
    const element = jsx(Ask.Rating, {
      name: 'priority',
      label: 'Priority',
      min: 1,
      max: 5,
      labels: { 1: 'Low', 3: 'Medium', 5: 'High' },
    });

    const result = render(element, {
      inputs: { priority: 3 },
    });

    expect(result.text).toBe('3 (Medium)');
  });

  it('should collect labels from Label children', () => {
    const element = jsx(Ask.Rating, {
      name: 'urgency',
      label: 'Urgency',
      min: 1,
      max: 5,
      children: [
        jsx(Label, { value: 1, children: 'Low' }),
        jsx(Label, { value: 5, children: 'Critical' }),
      ],
    });

    const iterator = createInputIterator(element);
    iterator.start();
    const req = iterator.current();

    expect(req?.type).toBe('rating');
    expect(req?.labels).toEqual({ 1: 'Low', 5: 'Critical' });
  });

  it('should include min/max in requirement', () => {
    const element = jsx(Ask.Rating, {
      name: 'score',
      label: 'Score',
      min: 0,
      max: 10,
    });

    const iterator = createInputIterator(element);
    iterator.start();
    const req = iterator.current();

    expect(req?.min).toBe(0);
    expect(req?.max).toBe(10);
  });
});
