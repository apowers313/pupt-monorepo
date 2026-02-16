import '../../../../components';

import { describe, expect,it } from 'vitest';

import { Ask, AskLabel,AskOption } from '../../../../components/ask';
import { jsx } from '../../../../src/jsx-runtime';
import { render } from '../../../../src/render';
import { createInputIterator } from '../../../../src/services/input-iterator';

describe('Ask.Editor', () => {
  it('should render placeholder when no input provided', async () => {
    const element = jsx(Ask.Editor, {
      name: 'code',
      label: 'Paste your code',
      language: 'typescript',
    });

    const result = await render(element);
    expect(result.text).toBe('{code}');
  });

  it('should render input value when provided', async () => {
    const element = jsx(Ask.Editor, {
      name: 'code',
      label: 'Paste your code',
    });

    const result = await render(element, {
      inputs: { code: 'const x = 1;' },
    });

    expect(result.text).toBe('const x = 1;');
  });

  it('should include language in requirement', async () => {
    const element = jsx(Ask.Editor, {
      name: 'code',
      label: 'Paste code',
      language: 'python',
    });

    const iterator = createInputIterator(element);
    await iterator.start();
    const req = iterator.current();

    expect(req?.language).toBe('python');
  });
});

describe('Ask.MultiSelect', () => {
  it('should render comma-separated values', async () => {
    const element = jsx(Ask.MultiSelect, {
      name: 'features',
      label: 'Select features',
      children: [
        jsx(AskOption, { value: 'auth', children: 'Authentication' }),
        jsx(AskOption, { value: 'api', children: 'API' }),
        jsx(AskOption, { value: 'db', children: 'Database' }),
      ],
    });

    const result = await render(element, {
      inputs: { features: ['auth', 'db'] },
    });

    expect(result.text).toBe('Authentication, Database');
  });

  it('should collect options from children', async () => {
    const element = jsx(Ask.MultiSelect, {
      name: 'features',
      label: 'Select features',
      children: [
        jsx(AskOption, { value: 'a', children: 'Option A' }),
        jsx(AskOption, { value: 'b', children: 'Option B' }),
      ],
    });

    const iterator = createInputIterator(element);
    await iterator.start();
    const req = iterator.current();

    expect(req?.type).toBe('multiselect');
    expect(req?.options).toHaveLength(2);
  });

  it('should support min/max constraints', async () => {
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
    await iterator.start();
    const req = iterator.current();

    expect(req?.min).toBe(1);
    expect(req?.max).toBe(3);
  });
});

describe('Ask.File', () => {
  it('should render placeholder when no input', async () => {
    const element = jsx(Ask.File, {
      name: 'config',
      label: 'Config file',
    });

    const result = await render(element);
    expect(result.text).toBe('{config}');
  });

  it('should render file path when provided', async () => {
    const element = jsx(Ask.File, {
      name: 'config',
      label: 'Config file',
    });

    const result = await render(element, {
      inputs: { config: '/path/to/config.json' },
    });

    expect(result.text).toBe('/path/to/config.json');
  });

  it('should include file-specific properties in requirement', async () => {
    const element = jsx(Ask.File, {
      name: 'source',
      label: 'Source files',
      extensions: ['.ts', '.tsx'],
      multiple: true,
      mustExist: true,
    });

    const iterator = createInputIterator(element);
    await iterator.start();
    const req = iterator.current();

    expect(req?.type).toBe('file');
    expect(req?.extensions).toEqual(['.ts', '.tsx']);
    expect(req?.multiple).toBe(true);
    expect(req?.mustExist).toBe(true);
  });
});

describe('Ask.Path', () => {
  it('should render path when provided', async () => {
    const element = jsx(Ask.Path, {
      name: 'output',
      label: 'Output directory',
    });

    const result = await render(element, {
      inputs: { output: '/home/user/output' },
    });

    expect(result.text).toBe('/home/user/output');
  });

  it('should include path-specific properties', async () => {
    const element = jsx(Ask.Path, {
      name: 'dir',
      label: 'Directory',
      mustExist: true,
      mustBeDirectory: true,
    });

    const iterator = createInputIterator(element);
    await iterator.start();
    const req = iterator.current();

    expect(req?.type).toBe('path');
    expect(req?.mustExist).toBe(true);
    expect(req?.mustBeDirectory).toBe(true);
  });
});

describe('Ask.Date', () => {
  it('should render date when provided', async () => {
    const element = jsx(Ask.Date, {
      name: 'deadline',
      label: 'Deadline',
    });

    const result = await render(element, {
      inputs: { deadline: '2024-12-31' },
    });

    expect(result.text).toBe('2024-12-31');
  });

  it('should include date-specific properties', async () => {
    const element = jsx(Ask.Date, {
      name: 'deadline',
      label: 'Deadline',
      includeTime: true,
      minDate: 'today',
    });

    const iterator = createInputIterator(element);
    await iterator.start();
    const req = iterator.current();

    expect(req?.type).toBe('date');
    expect(req?.includeTime).toBe(true);
    expect(req?.minDate).toBe('today');
  });
});

describe('Ask.Secret', () => {
  it('should render value when provided', async () => {
    const element = jsx(Ask.Secret, {
      name: 'apiKey',
      label: 'API Key',
    });

    const result = await render(element, {
      inputs: { apiKey: 'sk-1234' },
    });

    expect(result.text).toBe('sk-1234');
  });

  it('should mark as masked in requirement', async () => {
    const element = jsx(Ask.Secret, {
      name: 'password',
      label: 'Password',
    });

    const iterator = createInputIterator(element);
    await iterator.start();
    const req = iterator.current();

    expect(req?.type).toBe('secret');
    expect(req?.masked).toBe(true);
  });
});

describe('Ask.Choice', () => {
  it('should render selected option label', async () => {
    const element = jsx(Ask.Choice, {
      name: 'approach',
      label: 'Which approach?',
      options: [
        { value: 'refactor', label: 'Refactor code' },
        { value: 'rewrite', label: 'Rewrite from scratch' },
      ],
    });

    const result = await render(element, {
      inputs: { approach: 'refactor' },
    });

    expect(result.text).toBe('Refactor code');
  });

  it('should have exactly 2 options', async () => {
    const element = jsx(Ask.Choice, {
      name: 'choice',
      label: 'Choose',
      options: [
        { value: 'a', label: 'Option A' },
        { value: 'b', label: 'Option B' },
      ],
    });

    const iterator = createInputIterator(element);
    await iterator.start();
    const req = iterator.current();

    expect(req?.options).toHaveLength(2);
  });
});

describe('Ask.Rating', () => {
  it('should render rating value', async () => {
    const element = jsx(Ask.Rating, {
      name: 'priority',
      label: 'Priority',
      min: 1,
      max: 5,
    });

    const result = await render(element, {
      inputs: { priority: 3 },
    });

    expect(result.text).toBe('3');
  });

  it('should render rating with label when available', async () => {
    const element = jsx(Ask.Rating, {
      name: 'priority',
      label: 'Priority',
      min: 1,
      max: 5,
      labels: { 1: 'Low', 3: 'Medium', 5: 'High' },
    });

    const result = await render(element, {
      inputs: { priority: 3 },
    });

    expect(result.text).toBe('3 (Medium)');
  });

  it('should collect labels from AskLabel children', async () => {
    const element = jsx(Ask.Rating, {
      name: 'urgency',
      label: 'Urgency',
      min: 1,
      max: 5,
      children: [
        jsx(AskLabel, { value: 1, children: 'Low' }),
        jsx(AskLabel, { value: 5, children: 'Critical' }),
      ],
    });

    const iterator = createInputIterator(element);
    await iterator.start();
    const req = iterator.current();

    expect(req?.type).toBe('rating');
    expect(req?.labels).toEqual({ 1: 'Low', 5: 'Critical' });
  });

  it('should include min/max in requirement', async () => {
    const element = jsx(Ask.Rating, {
      name: 'score',
      label: 'Score',
      min: 0,
      max: 10,
    });

    const iterator = createInputIterator(element);
    await iterator.start();
    const req = iterator.current();

    expect(req?.min).toBe(0);
    expect(req?.max).toBe(10);
  });
});
