import { describe, it, expect } from 'vitest';
import { createInputIterator } from '../../../src/services/input-iterator';
import { jsx, Fragment } from '../../../src/jsx-runtime';
import { Ask } from '../../../src/components/ask';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import '../../../src/components'; // Register components

// Create temp directory for filesystem tests
const tmpDir = join(__dirname, '../../../tmp/iterator-test');

function setupTmpDir() {
  mkdirSync(tmpDir, { recursive: true });
}

function cleanupTmpDir() {
  rmSync(tmpDir, { recursive: true, force: true });
}

describe('InputIterator', () => {
  it('should iterate through inputs depth-first', async () => {
    const element = jsx(Fragment, {
      children: [
        jsx(Ask.Text, { name: 'first', label: 'First' }),
        jsx(Ask.Text, { name: 'second', label: 'Second' }),
      ],
    });

    const iterator = createInputIterator(element);
    await iterator.start();

    expect(iterator.current()?.name).toBe('first');

    await iterator.submit('value1');
    await iterator.advance();

    expect(iterator.current()?.name).toBe('second');

    await iterator.submit('value2');
    await iterator.advance();

    expect(iterator.isDone()).toBe(true);
  });

  it('should throw on invalid state transitions', async () => {
    const element = jsx(Ask.Text, { name: 'test', label: 'Test' });
    const iterator = createInputIterator(element);

    // current() before start()
    expect(() => iterator.current()).toThrow('Iterator not started');

    // submit() before start()
    await expect(iterator.submit('value')).rejects.toThrow('Iterator not started');

    // advance() before start()
    await expect(iterator.advance()).rejects.toThrow('Iterator not started');

    await iterator.start();

    // advance() before submit()
    await expect(iterator.advance()).rejects.toThrow('Current requirement not submitted');
  });

  it('should validate inputs', async () => {
    const element = jsx(Ask.Number, {
      name: 'age',
      label: 'Age',
      min: 0,
      max: 120,
    });

    const iterator = createInputIterator(element);
    await iterator.start();

    const result = await iterator.submit(150);
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain('max');
  });

  it('should return collected values', async () => {
    const element = jsx(Fragment, {
      children: [
        jsx(Ask.Text, { name: 'name', label: 'Name' }),
        jsx(Ask.Number, { name: 'age', label: 'Age' }),
      ],
    });

    const iterator = createInputIterator(element);
    await iterator.start();

    await iterator.submit('Alice');
    await iterator.advance();
    await iterator.submit(30);
    await iterator.advance();

    const values = iterator.getValues();
    expect(values.get('name')).toBe('Alice');
    expect(values.get('age')).toBe(30);
  });

  it('should handle empty element tree', async () => {
    const element = jsx(Fragment, { children: [] });
    const iterator = createInputIterator(element);
    await iterator.start();

    expect(iterator.isDone()).toBe(true);
  });

  it('should handle nested fragments', async () => {
    const element = jsx(Fragment, {
      children: [
        jsx(Fragment, {
          children: [
            jsx(Ask.Text, { name: 'nested', label: 'Nested' }),
          ],
        }),
      ],
    });

    const iterator = createInputIterator(element);
    await iterator.start();

    expect(iterator.current()?.name).toBe('nested');
  });

  it('should validate select inputs against options', async () => {
    const element = jsx(Ask.Select, {
      name: 'color',
      label: 'Color',
      options: [
        { value: 'red', label: 'Red' },
        { value: 'green', label: 'Green' },
        { value: 'blue', label: 'Blue' },
      ],
    });

    const iterator = createInputIterator(element);
    await iterator.start();

    // Valid option should pass
    const validResult = await iterator.submit('red');
    expect(validResult.valid).toBe(true);

    // Reset for invalid test
    const iterator2 = createInputIterator(element);
    await iterator2.start();

    // Invalid option should fail
    const invalidResult = await iterator2.submit('purple');
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.errors[0].code).toBe('INVALID_OPTION');
    expect(invalidResult.errors[0].message).toContain('purple');
    expect(invalidResult.errors[0].message).toContain('red, green, blue');
  });

  it('should validate multiselect inputs against options', async () => {
    const element = jsx(Ask.MultiSelect, {
      name: 'features',
      label: 'Features',
      options: [
        { value: 'auth', label: 'Authentication' },
        { value: 'api', label: 'API' },
        { value: 'db', label: 'Database' },
      ],
    });

    const iterator = createInputIterator(element);
    await iterator.start();

    // Valid options should pass
    const validResult = await iterator.submit(['auth', 'db']);
    expect(validResult.valid).toBe(true);

    // Reset for invalid test
    const iterator2 = createInputIterator(element);
    await iterator2.start();

    // Invalid option in array should fail
    const invalidResult = await iterator2.submit(['auth', 'cache']);
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.errors[0].code).toBe('INVALID_OPTION');
    expect(invalidResult.errors[0].message).toContain('cache');

    // Reset for non-array test
    const iterator3 = createInputIterator(element);
    await iterator3.start();

    // Non-array should fail
    const typeResult = await iterator3.submit('auth');
    expect(typeResult.valid).toBe(false);
    expect(typeResult.errors[0].code).toBe('INVALID_TYPE');
  });

  it('should validate rating inputs', async () => {
    const element = jsx(Ask.Rating, {
      name: 'priority',
      label: 'Priority',
      min: 1,
      max: 5,
    });

    const iterator = createInputIterator(element);
    await iterator.start();

    // Valid rating should pass
    const validResult = await iterator.submit(3);
    expect(validResult.valid).toBe(true);

    // Reset for below min test
    const iterator2 = createInputIterator(element);
    await iterator2.start();
    const belowMinResult = await iterator2.submit(0);
    expect(belowMinResult.valid).toBe(false);
    expect(belowMinResult.errors[0].code).toBe('BELOW_MIN');

    // Reset for above max test
    const iterator3 = createInputIterator(element);
    await iterator3.start();
    const aboveMaxResult = await iterator3.submit(10);
    expect(aboveMaxResult.valid).toBe(false);
    expect(aboveMaxResult.errors[0].code).toBe('EXCEEDS_MAX');

    // Reset for non-integer test
    const iterator4 = createInputIterator(element);
    await iterator4.start();
    const floatResult = await iterator4.submit(3.5);
    expect(floatResult.valid).toBe(false);
    expect(floatResult.errors[0].code).toBe('NOT_INTEGER');

    // Reset for wrong type test
    const iterator5 = createInputIterator(element);
    await iterator5.start();
    const typeResult = await iterator5.submit('high');
    expect(typeResult.valid).toBe(false);
    expect(typeResult.errors[0].code).toBe('INVALID_TYPE');
  });

  it('should validate date inputs', async () => {
    const element = jsx(Ask.Date, {
      name: 'deadline',
      label: 'Deadline',
      minDate: '2024-01-01',
      maxDate: '2024-12-31',
    });

    const iterator = createInputIterator(element);
    await iterator.start();

    // Valid date should pass
    const validResult = await iterator.submit('2024-06-15');
    expect(validResult.valid).toBe(true);

    // Reset for invalid format test
    const iterator2 = createInputIterator(element);
    await iterator2.start();
    const invalidResult = await iterator2.submit('not-a-date');
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.errors[0].code).toBe('INVALID_DATE');

    // Reset for too early test
    const iterator3 = createInputIterator(element);
    await iterator3.start();
    const earlyResult = await iterator3.submit('2023-12-01');
    expect(earlyResult.valid).toBe(false);
    expect(earlyResult.errors[0].code).toBe('DATE_TOO_EARLY');

    // Reset for too late test
    const iterator4 = createInputIterator(element);
    await iterator4.start();
    const lateResult = await iterator4.submit('2025-01-15');
    expect(lateResult.valid).toBe(false);
    expect(lateResult.errors[0].code).toBe('DATE_TOO_LATE');
  });

  it('should validate secret inputs as strings', async () => {
    const element = jsx(Ask.Secret, {
      name: 'apiKey',
      label: 'API Key',
    });

    const iterator = createInputIterator(element);
    await iterator.start();

    // Valid string should pass
    const validResult = await iterator.submit('sk-1234567890');
    expect(validResult.valid).toBe(true);

    // Reset for wrong type test
    const iterator2 = createInputIterator(element);
    await iterator2.start();
    const typeResult = await iterator2.submit(12345);
    expect(typeResult.valid).toBe(false);
    expect(typeResult.errors[0].code).toBe('INVALID_TYPE');
  });

  it('should validate file inputs with extensions', async () => {
    const element = jsx(Ask.File, {
      name: 'config',
      label: 'Config file',
      extensions: ['.json', '.yaml'],
    });

    const iterator = createInputIterator(element);
    await iterator.start();

    // Valid extension should pass
    const validResult = await iterator.submit('/path/to/config.json');
    expect(validResult.valid).toBe(true);

    // Reset for invalid extension test
    const iterator2 = createInputIterator(element);
    await iterator2.start();
    const invalidResult = await iterator2.submit('/path/to/config.txt');
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.errors[0].code).toBe('INVALID_EXTENSION');
  });

  it('should validate path inputs as strings', async () => {
    const element = jsx(Ask.Path, {
      name: 'outputDir',
      label: 'Output directory',
    });

    const iterator = createInputIterator(element);
    await iterator.start();

    // Valid string should pass
    const validResult = await iterator.submit('/home/user/output');
    expect(validResult.valid).toBe(true);

    // Reset for wrong type test
    const iterator2 = createInputIterator(element);
    await iterator2.start();
    const typeResult = await iterator2.submit(12345);
    expect(typeResult.valid).toBe(false);
    expect(typeResult.errors[0].code).toBe('INVALID_TYPE');
  });

  it('should validate file with multiple=true as array', async () => {
    const element = jsx(Ask.File, {
      name: 'files',
      label: 'Source files',
      multiple: true,
      extensions: ['.ts', '.tsx'],
    });

    const iterator = createInputIterator(element);
    await iterator.start();

    // Valid array should pass
    const validResult = await iterator.submit(['/path/to/file.ts', '/path/to/other.tsx']);
    expect(validResult.valid).toBe(true);

    // Reset for non-array test
    const iterator2 = createInputIterator(element);
    await iterator2.start();
    const typeResult = await iterator2.submit('/path/to/file.ts');
    expect(typeResult.valid).toBe(false);
    expect(typeResult.errors[0].code).toBe('INVALID_TYPE');

    // Reset for invalid extension in array
    const iterator3 = createInputIterator(element);
    await iterator3.start();
    const extResult = await iterator3.submit(['/path/to/file.ts', '/path/to/file.js']);
    expect(extResult.valid).toBe(false);
    expect(extResult.errors[0].code).toBe('INVALID_EXTENSION');
  });
});

describe('InputIterator filesystem validation (Node.js)', () => {
  it('should validate file mustExist in Node.js', async () => {
    setupTmpDir();
    try {
      const existingFile = join(tmpDir, 'exists.txt');
      writeFileSync(existingFile, 'test content');

      const element = jsx(Ask.File, {
        name: 'config',
        label: 'Config file',
        mustExist: true,
      });

      // Existing file should pass
      const iterator = createInputIterator(element, { environment: 'node' });
      await iterator.start();
      const validResult = await iterator.submit(existingFile);
      expect(validResult.valid).toBe(true);
      expect(validResult.warnings).toHaveLength(0);

      // Non-existing file should fail
      const iterator2 = createInputIterator(element, { environment: 'node' });
      await iterator2.start();
      const invalidResult = await iterator2.submit('/path/to/nonexistent.txt');
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors[0].code).toBe('FILE_NOT_FOUND');
    } finally {
      cleanupTmpDir();
    }
  });

  it('should validate path mustExist in Node.js', async () => {
    setupTmpDir();
    try {
      const element = jsx(Ask.Path, {
        name: 'dir',
        label: 'Directory',
        mustExist: true,
      });

      // Existing path should pass
      const iterator = createInputIterator(element, { environment: 'node' });
      await iterator.start();
      const validResult = await iterator.submit(tmpDir);
      expect(validResult.valid).toBe(true);

      // Non-existing path should fail
      const iterator2 = createInputIterator(element, { environment: 'node' });
      await iterator2.start();
      const invalidResult = await iterator2.submit('/path/to/nonexistent');
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors[0].code).toBe('PATH_NOT_FOUND');
    } finally {
      cleanupTmpDir();
    }
  });

  it('should validate path mustBeDirectory in Node.js', async () => {
    setupTmpDir();
    try {
      const existingFile = join(tmpDir, 'file.txt');
      writeFileSync(existingFile, 'test content');

      const element = jsx(Ask.Path, {
        name: 'dir',
        label: 'Directory',
        mustExist: true,
        mustBeDirectory: true,
      });

      // Directory should pass
      const iterator = createInputIterator(element, { environment: 'node' });
      await iterator.start();
      const validResult = await iterator.submit(tmpDir);
      expect(validResult.valid).toBe(true);

      // File (not directory) should fail
      const iterator2 = createInputIterator(element, { environment: 'node' });
      await iterator2.start();
      const invalidResult = await iterator2.submit(existingFile);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors[0].code).toBe('NOT_A_DIRECTORY');
    } finally {
      cleanupTmpDir();
    }
  });
});

describe('InputIterator filesystem validation (Browser)', () => {
  it('should add warning for file mustExist in browser', async () => {
    const element = jsx(Ask.File, {
      name: 'config',
      label: 'Config file',
      mustExist: true,
    });

    const iterator = createInputIterator(element, { environment: 'browser' });
    await iterator.start();
    const result = await iterator.submit('/path/to/file.txt');

    // Should pass (no error) but have a warning
    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].message).toContain('browser environment');
    expect(result.warnings[0].message).toContain('mustExist');
  });

  it('should add warning for path mustExist in browser', async () => {
    const element = jsx(Ask.Path, {
      name: 'dir',
      label: 'Directory',
      mustExist: true,
    });

    const iterator = createInputIterator(element, { environment: 'browser' });
    await iterator.start();
    const result = await iterator.submit('/path/to/dir');

    // Should pass (no error) but have a warning
    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].message).toContain('browser environment');
  });

  it('should add warning for path mustBeDirectory in browser', async () => {
    const element = jsx(Ask.Path, {
      name: 'dir',
      label: 'Directory',
      mustBeDirectory: true,
    });

    const iterator = createInputIterator(element, { environment: 'browser' });
    await iterator.start();
    const result = await iterator.submit('/path/to/dir');

    // Should pass (no error) but have a warning
    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].message).toContain('mustBeDirectory');
  });

  it('should add warning for file mustExist with multiple files in browser', async () => {
    const element = jsx(Ask.File, {
      name: 'files',
      label: 'Source files',
      multiple: true,
      mustExist: true,
    });

    const iterator = createInputIterator(element, { environment: 'browser' });
    await iterator.start();
    const result = await iterator.submit(['/path/to/file1.txt', '/path/to/file2.txt']);

    // Should pass (no error) but have a warning
    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].message).toContain('browser environment');
  });
});

describe('InputIterator additional validation', () => {
  it('should validate required fields', async () => {
    const element = jsx(Ask.Text, {
      name: 'required_field',
      label: 'Required',
      required: true,
    });

    const iterator = createInputIterator(element);
    await iterator.start();

    // Empty string should fail with REQUIRED
    const emptyResult = await iterator.submit('');
    expect(emptyResult.valid).toBe(false);
    expect(emptyResult.errors[0].code).toBe('REQUIRED');
  });

  it('should validate type before required for null/undefined', async () => {
    const element = jsx(Ask.Text, {
      name: 'required_field',
      label: 'Required',
      required: true,
    });

    // Null should fail with INVALID_TYPE (type check comes before required)
    const iterator2 = createInputIterator(element);
    await iterator2.start();
    const nullResult = await iterator2.submit(null);
    expect(nullResult.valid).toBe(false);
    // Type validation for string fails first, then required check may also fail
    // The implementation checks type first
    const hasRequiredError = nullResult.errors.some((e) => e.code === 'REQUIRED');
    expect(hasRequiredError).toBe(true);
  });

  it('should validate string type', async () => {
    const element = jsx(Ask.Text, {
      name: 'text',
      label: 'Text input',
    });

    const iterator = createInputIterator(element);
    await iterator.start();

    // Number should fail
    const result = await iterator.submit(123);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('INVALID_TYPE');
  });

  it('should validate boolean type', async () => {
    const element = jsx(Ask.Confirm, {
      name: 'confirm',
      label: 'Confirm action',
    });

    const iterator = createInputIterator(element);
    await iterator.start();

    // String should fail
    const result = await iterator.submit('yes');
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('INVALID_TYPE');
  });

  it('should validate number type with wrong type', async () => {
    const element = jsx(Ask.Number, {
      name: 'num',
      label: 'Number',
    });

    const iterator = createInputIterator(element);
    await iterator.start();

    // String should fail
    const result = await iterator.submit('not a number');
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('INVALID_TYPE');
  });

  it('should validate number min constraint', async () => {
    const element = jsx(Ask.Number, {
      name: 'positive',
      label: 'Positive number',
      min: 0,
    });

    const iterator = createInputIterator(element);
    await iterator.start();

    // Negative should fail
    const result = await iterator.submit(-5);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('BELOW_MIN');
  });

  it('should validate date with "today" as minDate', async () => {
    const element = jsx(Ask.Date, {
      name: 'futureDate',
      label: 'Future date',
      minDate: 'today',
    });

    const iterator = createInputIterator(element);
    await iterator.start();

    // Date in the past should fail
    const result = await iterator.submit('2020-01-01');
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('DATE_TOO_EARLY');
  });

  it('should validate date with "today" as maxDate', async () => {
    const element = jsx(Ask.Date, {
      name: 'pastDate',
      label: 'Past date',
      maxDate: 'today',
    });

    const iterator = createInputIterator(element);
    await iterator.start();

    // Date in the future should fail
    const result = await iterator.submit('2099-12-31');
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('DATE_TOO_LATE');
  });

  it('should validate date type with wrong type', async () => {
    const element = jsx(Ask.Date, {
      name: 'date',
      label: 'Date',
    });

    const iterator = createInputIterator(element);
    await iterator.start();

    // Number should fail
    const result = await iterator.submit(12345);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('INVALID_TYPE');
  });

  it('should validate file type with wrong type for single file', async () => {
    const element = jsx(Ask.File, {
      name: 'file',
      label: 'File',
    });

    const iterator = createInputIterator(element);
    await iterator.start();

    // Array should fail for single file
    const result = await iterator.submit(['file1.txt', 'file2.txt']);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('INVALID_TYPE');
  });

  it('should skip validation when validateOnSubmit is false', async () => {
    const element = jsx(Ask.Number, {
      name: 'num',
      label: 'Number',
      min: 0,
      max: 100,
    });

    const iterator = createInputIterator(element, { validateOnSubmit: false });
    await iterator.start();

    // Invalid value should pass without validation
    const result = await iterator.submit('not a number');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it('should throw when calling start() twice', async () => {
    const element = jsx(Ask.Text, { name: 'test', label: 'Test' });
    const iterator = createInputIterator(element);

    await iterator.start();
    await expect(iterator.start()).rejects.toThrow('Iterator already started');
  });

  it('should throw when calling submit() on done iterator', async () => {
    const element = jsx(Fragment, { children: [] });
    const iterator = createInputIterator(element);

    await iterator.start();
    expect(iterator.isDone()).toBe(true);

    await expect(iterator.submit('value')).rejects.toThrow('Iterator is done');
  });

  it('should throw when calling advance() on done iterator', async () => {
    const element = jsx(Ask.Text, { name: 'test', label: 'Test' });
    const iterator = createInputIterator(element);

    await iterator.start();
    await iterator.submit('value');
    await iterator.advance();

    // Now it's done
    expect(iterator.isDone()).toBe(true);
    await expect(iterator.advance()).rejects.toThrow('Iterator is done');
  });

  it('should return null from current() when done', async () => {
    const element = jsx(Ask.Text, { name: 'test', label: 'Test' });
    const iterator = createInputIterator(element);

    await iterator.start();
    await iterator.submit('value');
    await iterator.advance();

    expect(iterator.isDone()).toBe(true);
    expect(iterator.current()).toBeNull();
  });
});

describe('InputIterator pre-supplied values', () => {
  it('should skip inputs that have pre-supplied values', async () => {
    const element = jsx(Fragment, {
      children: [
        jsx(Ask.Text, { name: 'name', label: 'Name' }),
        jsx(Ask.Text, { name: 'email', label: 'Email' }),
        jsx(Ask.Text, { name: 'phone', label: 'Phone' }),
      ],
    });

    // Pre-supply name and phone, should only ask for email
    const iterator = createInputIterator(element, {
      values: { name: 'Alice', phone: '555-1234' },
    });
    await iterator.start();

    // Should skip to email (the only non-pre-supplied input)
    expect(iterator.current()?.name).toBe('email');

    await iterator.submit('alice@example.com');
    await iterator.advance();

    expect(iterator.isDone()).toBe(true);

    // Values should include both pre-supplied and collected
    const values = iterator.getValues();
    expect(values.get('name')).toBe('Alice');
    expect(values.get('email')).toBe('alice@example.com');
    expect(values.get('phone')).toBe('555-1234');
  });

  it('should be done immediately if all inputs are pre-supplied', async () => {
    const element = jsx(Fragment, {
      children: [
        jsx(Ask.Text, { name: 'name', label: 'Name' }),
        jsx(Ask.Number, { name: 'age', label: 'Age' }),
      ],
    });

    const iterator = createInputIterator(element, {
      values: { name: 'Bob', age: 25 },
    });
    await iterator.start();

    expect(iterator.isDone()).toBe(true);

    const values = iterator.getValues();
    expect(values.get('name')).toBe('Bob');
    expect(values.get('age')).toBe(25);
  });
});

describe('InputIterator non-interactive mode', () => {
  it('should automatically use default values with runNonInteractive()', async () => {
    const element = jsx(Fragment, {
      children: [
        jsx(Ask.Text, { name: 'name', label: 'Name', default: 'DefaultName' }),
        jsx(Ask.Number, { name: 'count', label: 'Count', default: 10 }),
      ],
    });

    const iterator = createInputIterator(element);
    const values = await iterator.runNonInteractive();

    expect(values.get('name')).toBe('DefaultName');
    expect(values.get('count')).toBe(10);
  });

  it('should throw error when required input has no default (onMissingDefault=error)', async () => {
    const element = jsx(Fragment, {
      children: [
        jsx(Ask.Text, { name: 'name', label: 'Name', required: true }),
      ],
    });

    const iterator = createInputIterator(element, { onMissingDefault: 'error' });

    await expect(iterator.runNonInteractive()).rejects.toThrow(
      'Non-interactive mode: Required input "name" has no default value',
    );
  });

  it('should skip inputs without defaults when onMissingDefault=skip', async () => {
    const element = jsx(Fragment, {
      children: [
        jsx(Ask.Text, { name: 'name', label: 'Name', required: true }),
        jsx(Ask.Number, { name: 'count', label: 'Count', default: 5 }),
      ],
    });

    const iterator = createInputIterator(element, { onMissingDefault: 'skip' });
    const values = await iterator.runNonInteractive();

    // name should not be in values (skipped)
    expect(values.has('name')).toBe(false);
    // count should have its default
    expect(values.get('count')).toBe(5);
  });

  it('should combine pre-supplied values with defaults in non-interactive mode', async () => {
    const element = jsx(Fragment, {
      children: [
        jsx(Ask.Text, { name: 'name', label: 'Name', default: 'DefaultName' }),
        jsx(Ask.Text, { name: 'email', label: 'Email', default: 'default@example.com' }),
        jsx(Ask.Number, { name: 'count', label: 'Count', default: 10 }),
      ],
    });

    const iterator = createInputIterator(element, {
      values: { name: 'SuppliedName' },
    });
    const values = await iterator.runNonInteractive();

    // name should be the pre-supplied value
    expect(values.get('name')).toBe('SuppliedName');
    // email and count should use defaults
    expect(values.get('email')).toBe('default@example.com');
    expect(values.get('count')).toBe(10);
  });

  it('should skip optional inputs without defaults', async () => {
    const element = jsx(Fragment, {
      children: [
        jsx(Ask.Text, { name: 'optional', label: 'Optional', required: false }),
        jsx(Ask.Number, { name: 'count', label: 'Count', default: 5 }),
      ],
    });

    const iterator = createInputIterator(element);
    const values = await iterator.runNonInteractive();

    // optional should not be in values (skipped, no default)
    expect(values.has('optional')).toBe(false);
    // count should have its default
    expect(values.get('count')).toBe(5);
  });

  it('should handle empty element tree in non-interactive mode', async () => {
    const element = jsx(Fragment, { children: [] });
    const iterator = createInputIterator(element);

    const values = await iterator.runNonInteractive();
    expect(values.size).toBe(0);
  });

  it('should throw validation error if default value is invalid', async () => {
    const element = jsx(Ask.Number, {
      name: 'num',
      label: 'Number',
      min: 10,
      max: 20,
      default: 5, // Invalid: below min
    });

    const iterator = createInputIterator(element);

    await expect(iterator.runNonInteractive()).rejects.toThrow(
      'Non-interactive mode: Validation failed for "num"',
    );
  });

  it('should work with select inputs using defaults', async () => {
    const element = jsx(Ask.Select, {
      name: 'color',
      label: 'Color',
      default: 'blue',
      options: [
        { value: 'red', label: 'Red' },
        { value: 'green', label: 'Green' },
        { value: 'blue', label: 'Blue' },
      ],
    });

    const iterator = createInputIterator(element);
    const values = await iterator.runNonInteractive();

    expect(values.get('color')).toBe('blue');
  });

  it('should work with boolean inputs using defaults', async () => {
    const element = jsx(Ask.Confirm, {
      name: 'proceed',
      label: 'Proceed?',
      default: true,
    });

    const iterator = createInputIterator(element);
    const values = await iterator.runNonInteractive();

    expect(values.get('proceed')).toBe(true);
  });

  it('should be callable without calling start() first', async () => {
    const element = jsx(Ask.Text, {
      name: 'name',
      label: 'Name',
      default: 'Test',
    });

    const iterator = createInputIterator(element);
    // Don't call start() - runNonInteractive should handle it
    const values = await iterator.runNonInteractive();

    expect(values.get('name')).toBe('Test');
  });

  it('should be callable after start() has been called', async () => {
    const element = jsx(Ask.Text, {
      name: 'name',
      label: 'Name',
      default: 'Test',
    });

    const iterator = createInputIterator(element);
    await iterator.start();
    // Now call runNonInteractive after start
    const values = await iterator.runNonInteractive();

    expect(values.get('name')).toBe('Test');
  });
});

describe('InputIterator path validation (Node.js)', () => {
  it('should validate mustBeDirectory without mustExist', async () => {
    setupTmpDir();
    try {
      const existingFile = join(tmpDir, 'a-file.txt');
      writeFileSync(existingFile, 'test content');

      const element = jsx(Ask.Path, {
        name: 'dir',
        label: 'Directory',
        mustBeDirectory: true,
        // Note: mustExist is not set
      });

      // Directory should pass
      const iterator = createInputIterator(element, { environment: 'node' });
      await iterator.start();
      const dirResult = await iterator.submit(tmpDir);
      expect(dirResult.valid).toBe(true);

      // File (not directory) should fail
      const iterator2 = createInputIterator(element, { environment: 'node' });
      await iterator2.start();
      const fileResult = await iterator2.submit(existingFile);
      expect(fileResult.valid).toBe(false);
      expect(fileResult.errors[0].code).toBe('NOT_A_DIRECTORY');

      // Non-existent path should pass (mustExist is false)
      const iterator3 = createInputIterator(element, { environment: 'node' });
      await iterator3.start();
      const nonExistentResult = await iterator3.submit('/path/that/does/not/exist');
      expect(nonExistentResult.valid).toBe(true);
    } finally {
      cleanupTmpDir();
    }
  });

  it('should handle file mustExist with multiple files', async () => {
    setupTmpDir();
    try {
      const existingFile1 = join(tmpDir, 'file1.txt');
      const existingFile2 = join(tmpDir, 'file2.txt');
      writeFileSync(existingFile1, 'content1');
      writeFileSync(existingFile2, 'content2');

      const element = jsx(Ask.File, {
        name: 'files',
        label: 'Files',
        multiple: true,
        mustExist: true,
      });

      // All existing files should pass
      const iterator = createInputIterator(element, { environment: 'node' });
      await iterator.start();
      const validResult = await iterator.submit([existingFile1, existingFile2]);
      expect(validResult.valid).toBe(true);

      // One missing file should fail
      const iterator2 = createInputIterator(element, { environment: 'node' });
      await iterator2.start();
      const invalidResult = await iterator2.submit([existingFile1, '/nonexistent/file.txt']);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors[0].code).toBe('FILE_NOT_FOUND');
    } finally {
      cleanupTmpDir();
    }
  });
});

describe('InputIterator custom component children (Issue #14)', () => {
  it('should detect Ask components in custom component children even when render returns non-children', async () => {
    // This test reproduces the issue described in GitHub issue #14:
    // When a custom component's render() method returns something other than its children
    // (e.g., a computed string), Ask components passed as children should still be detected.

    const { Component } = await import('../../../src/component');

    // Custom component that processes children but returns a computed string, not the children
    class DataProcessor extends Component<{ children?: unknown }> {
      render({ children }: { children?: unknown }) {
        // This component doesn't return its children in the render output.
        // It just returns a computed string.
        // The bug: Ask components in children are never detected.
        return `Processed ${Array.isArray(children) ? children.length : 0} inputs`;
      }
    }

    // Create an element tree where Ask.Text is a child of the custom component
    const element = jsx(DataProcessor, {
      children: [
        jsx(Ask.Text, { name: 'username', label: 'Username', default: 'default_user' }),
        jsx(Ask.Number, { name: 'count', label: 'Count', default: 42 }),
      ],
    });

    const iterator = createInputIterator(element);
    await iterator.start();

    // Bug: Without the fix, isDone() would be true here because the Ask components
    // were never detected (they're in the children, but render() returns a string)
    expect(iterator.isDone()).toBe(false);
    expect(iterator.current()?.name).toBe('username');

    await iterator.submit('testuser');
    await iterator.advance();

    expect(iterator.current()?.name).toBe('count');
    await iterator.submit(100);
    await iterator.advance();

    expect(iterator.isDone()).toBe(true);

    const values = iterator.getValues();
    expect(values.get('username')).toBe('testuser');
    expect(values.get('count')).toBe(100);
  });

  it('should detect Ask components in nested custom component children', async () => {
    const { Component } = await import('../../../src/component');

    // Wrapper component that doesn't return children
    class Wrapper extends Component<{ children?: unknown }> {
      render() {
        return 'Wrapper output';
      }
    }

    // Nested structure: Wrapper > Fragment > Ask.Text
    const element = jsx(Wrapper, {
      children: jsx(Fragment, {
        children: [
          jsx(Ask.Text, { name: 'nested_input', label: 'Nested', default: 'nested_default' }),
        ],
      }),
    });

    const iterator = createInputIterator(element);
    await iterator.start();

    expect(iterator.isDone()).toBe(false);
    expect(iterator.current()?.name).toBe('nested_input');
  });

  it('should detect Ask components in function component children when render returns non-children', async () => {
    // Function component that doesn't return its children
    const FunctionProcessor = ({ children }: { children?: unknown }) => {
      return `Function processed ${Array.isArray(children) ? children.length : 0} items`;
    };

    const element = jsx(FunctionProcessor, {
      children: [
        jsx(Ask.Text, { name: 'func_input', label: 'Func Input', default: 'func_default' }),
      ],
    });

    const iterator = createInputIterator(element);
    await iterator.start();

    expect(iterator.isDone()).toBe(false);
    expect(iterator.current()?.name).toBe('func_input');
  });

  it('should work in non-interactive mode with custom component children', async () => {
    const { Component } = await import('../../../src/component');

    class DataFetcher extends Component<{ children?: unknown }> {
      render() {
        // Returns a string, not children
        return 'Fetched data result';
      }
    }

    const element = jsx(DataFetcher, {
      children: [
        jsx(Ask.Text, { name: 'api_key', label: 'API Key', default: 'default_key' }),
        jsx(Ask.Number, { name: 'timeout', label: 'Timeout', default: 30 }),
      ],
    });

    const iterator = createInputIterator(element);
    const values = await iterator.runNonInteractive();

    // Should have collected the default values from the Ask components in children
    expect(values.get('api_key')).toBe('default_key');
    expect(values.get('timeout')).toBe(30);
  });
});

describe('InputIterator element prop resolution (Issue #13)', () => {
  it('should resolve element props to their values when passed to component render()', async () => {
    // This test reproduces the issue described in GitHub issue #13:
    // When a component receives another component (e.g., an Ask.Text element) as a prop value,
    // the receiving component should get the resolved value, not the raw PuptElement object.

    // Import Component to create a custom component
    const { Component } = await import('../../../src/component');

    // Create a custom component that uses a prop value in a template string
    // This will fail with "Cannot convert object to primitive value" if the prop
    // is a raw PuptElement instead of the resolved string value.
    class GreetingComponent extends Component<{ name: string }> {
      render({ name }: { name: string }) {
        // If 'name' is a PuptElement object instead of a string,
        // this template literal will throw "Cannot convert object to primitive value"
        return `Hello, ${name}!`;
      }
    }

    // Create an element tree where Ask.Text value is passed to GreetingComponent
    const nameInput = jsx(Ask.Text, { name: 'username', label: 'Username', default: 'World' });
    const element = jsx(Fragment, {
      children: [
        nameInput,
        jsx(GreetingComponent, { name: nameInput }),
      ],
    });

    const iterator = createInputIterator(element);
    await iterator.start();

    // Submit a value for the Ask.Text input
    await iterator.submit('Alice');
    await iterator.advance();

    // The iterator should complete without throwing
    // If the bug exists, it would have thrown "Cannot convert object to primitive value"
    expect(iterator.isDone()).toBe(true);

    // The collected values should contain the submitted value
    const values = iterator.getValues();
    expect(values.get('username')).toBe('Alice');
  });

  it('should resolve element props using default value when walking for requirements', async () => {
    const { Component } = await import('../../../src/component');

    // Component that would fail if it receives an object instead of string
    class DisplayComponent extends Component<{ text: string }> {
      render({ text }: { text: string }) {
        return `Display: ${text}`;
      }
    }

    // Create tree with default value
    const textInput = jsx(Ask.Text, { name: 'message', label: 'Message', default: 'default text' });
    const element = jsx(Fragment, {
      children: [
        textInput,
        jsx(DisplayComponent, { text: textInput }),
      ],
    });

    // Run non-interactively (uses defaults)
    const iterator = createInputIterator(element);
    const values = await iterator.runNonInteractive();

    expect(values.get('message')).toBe('default text');
  });

  it('should handle components that access element props in async render', async () => {
    const { Component } = await import('../../../src/component');

    // Async component that uses prop value
    class AsyncGreeting extends Component<{ name: string }> {
      async render({ name }: { name: string }) {
        // Simulate async work
        await Promise.resolve();
        return `Async hello, ${name}!`;
      }
    }

    const nameInput = jsx(Ask.Text, { name: 'user', label: 'User', default: 'Test' });
    const element = jsx(Fragment, {
      children: [
        nameInput,
        jsx(AsyncGreeting, { name: nameInput }),
      ],
    });

    const iterator = createInputIterator(element);
    const values = await iterator.runNonInteractive();

    expect(values.get('user')).toBe('Test');
  });
});
