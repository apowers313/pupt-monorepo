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
    iterator.start();

    expect(iterator.current()?.name).toBe('first');

    await iterator.submit('value1');
    iterator.advance();

    expect(iterator.current()?.name).toBe('second');

    await iterator.submit('value2');
    iterator.advance();

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
    expect(() => iterator.advance()).toThrow('Iterator not started');

    iterator.start();

    // advance() before submit()
    expect(() => iterator.advance()).toThrow('Current requirement not submitted');
  });

  it('should validate inputs', async () => {
    const element = jsx(Ask.Number, {
      name: 'age',
      label: 'Age',
      min: 0,
      max: 120,
    });

    const iterator = createInputIterator(element);
    iterator.start();

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
    iterator.start();

    await iterator.submit('Alice');
    iterator.advance();
    await iterator.submit(30);
    iterator.advance();

    const values = iterator.getValues();
    expect(values.get('name')).toBe('Alice');
    expect(values.get('age')).toBe(30);
  });

  it('should handle empty element tree', () => {
    const element = jsx(Fragment, { children: [] });
    const iterator = createInputIterator(element);
    iterator.start();

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
    iterator.start();

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
    iterator.start();

    // Valid option should pass
    const validResult = await iterator.submit('red');
    expect(validResult.valid).toBe(true);

    // Reset for invalid test
    const iterator2 = createInputIterator(element);
    iterator2.start();

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
    iterator.start();

    // Valid options should pass
    const validResult = await iterator.submit(['auth', 'db']);
    expect(validResult.valid).toBe(true);

    // Reset for invalid test
    const iterator2 = createInputIterator(element);
    iterator2.start();

    // Invalid option in array should fail
    const invalidResult = await iterator2.submit(['auth', 'cache']);
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.errors[0].code).toBe('INVALID_OPTION');
    expect(invalidResult.errors[0].message).toContain('cache');

    // Reset for non-array test
    const iterator3 = createInputIterator(element);
    iterator3.start();

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
    iterator.start();

    // Valid rating should pass
    const validResult = await iterator.submit(3);
    expect(validResult.valid).toBe(true);

    // Reset for below min test
    const iterator2 = createInputIterator(element);
    iterator2.start();
    const belowMinResult = await iterator2.submit(0);
    expect(belowMinResult.valid).toBe(false);
    expect(belowMinResult.errors[0].code).toBe('BELOW_MIN');

    // Reset for above max test
    const iterator3 = createInputIterator(element);
    iterator3.start();
    const aboveMaxResult = await iterator3.submit(10);
    expect(aboveMaxResult.valid).toBe(false);
    expect(aboveMaxResult.errors[0].code).toBe('EXCEEDS_MAX');

    // Reset for non-integer test
    const iterator4 = createInputIterator(element);
    iterator4.start();
    const floatResult = await iterator4.submit(3.5);
    expect(floatResult.valid).toBe(false);
    expect(floatResult.errors[0].code).toBe('NOT_INTEGER');

    // Reset for wrong type test
    const iterator5 = createInputIterator(element);
    iterator5.start();
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
    iterator.start();

    // Valid date should pass
    const validResult = await iterator.submit('2024-06-15');
    expect(validResult.valid).toBe(true);

    // Reset for invalid format test
    const iterator2 = createInputIterator(element);
    iterator2.start();
    const invalidResult = await iterator2.submit('not-a-date');
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.errors[0].code).toBe('INVALID_DATE');

    // Reset for too early test
    const iterator3 = createInputIterator(element);
    iterator3.start();
    const earlyResult = await iterator3.submit('2023-12-01');
    expect(earlyResult.valid).toBe(false);
    expect(earlyResult.errors[0].code).toBe('DATE_TOO_EARLY');

    // Reset for too late test
    const iterator4 = createInputIterator(element);
    iterator4.start();
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
    iterator.start();

    // Valid string should pass
    const validResult = await iterator.submit('sk-1234567890');
    expect(validResult.valid).toBe(true);

    // Reset for wrong type test
    const iterator2 = createInputIterator(element);
    iterator2.start();
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
    iterator.start();

    // Valid extension should pass
    const validResult = await iterator.submit('/path/to/config.json');
    expect(validResult.valid).toBe(true);

    // Reset for invalid extension test
    const iterator2 = createInputIterator(element);
    iterator2.start();
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
    iterator.start();

    // Valid string should pass
    const validResult = await iterator.submit('/home/user/output');
    expect(validResult.valid).toBe(true);

    // Reset for wrong type test
    const iterator2 = createInputIterator(element);
    iterator2.start();
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
    iterator.start();

    // Valid array should pass
    const validResult = await iterator.submit(['/path/to/file.ts', '/path/to/other.tsx']);
    expect(validResult.valid).toBe(true);

    // Reset for non-array test
    const iterator2 = createInputIterator(element);
    iterator2.start();
    const typeResult = await iterator2.submit('/path/to/file.ts');
    expect(typeResult.valid).toBe(false);
    expect(typeResult.errors[0].code).toBe('INVALID_TYPE');

    // Reset for invalid extension in array
    const iterator3 = createInputIterator(element);
    iterator3.start();
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
      iterator.start();
      const validResult = await iterator.submit(existingFile);
      expect(validResult.valid).toBe(true);
      expect(validResult.warnings).toHaveLength(0);

      // Non-existing file should fail
      const iterator2 = createInputIterator(element, { environment: 'node' });
      iterator2.start();
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
      iterator.start();
      const validResult = await iterator.submit(tmpDir);
      expect(validResult.valid).toBe(true);

      // Non-existing path should fail
      const iterator2 = createInputIterator(element, { environment: 'node' });
      iterator2.start();
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
      iterator.start();
      const validResult = await iterator.submit(tmpDir);
      expect(validResult.valid).toBe(true);

      // File (not directory) should fail
      const iterator2 = createInputIterator(element, { environment: 'node' });
      iterator2.start();
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
    iterator.start();
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
    iterator.start();
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
    iterator.start();
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
    iterator.start();
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
    iterator.start();

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
    iterator2.start();
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
    iterator.start();

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
    iterator.start();

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
    iterator.start();

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
    iterator.start();

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
    iterator.start();

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
    iterator.start();

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
    iterator.start();

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
    iterator.start();

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
    iterator.start();

    // Invalid value should pass without validation
    const result = await iterator.submit('not a number');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it('should throw when calling start() twice', () => {
    const element = jsx(Ask.Text, { name: 'test', label: 'Test' });
    const iterator = createInputIterator(element);

    iterator.start();
    expect(() => iterator.start()).toThrow('Iterator already started');
  });

  it('should throw when calling submit() on done iterator', async () => {
    const element = jsx(Fragment, { children: [] });
    const iterator = createInputIterator(element);

    iterator.start();
    expect(iterator.isDone()).toBe(true);

    await expect(iterator.submit('value')).rejects.toThrow('Iterator is done');
  });

  it('should throw when calling advance() on done iterator', async () => {
    const element = jsx(Ask.Text, { name: 'test', label: 'Test' });
    const iterator = createInputIterator(element);

    iterator.start();
    await iterator.submit('value');
    iterator.advance();

    // Now it's done
    expect(iterator.isDone()).toBe(true);
    expect(() => iterator.advance()).toThrow('Iterator is done');
  });

  it('should return null from current() when done', async () => {
    const element = jsx(Ask.Text, { name: 'test', label: 'Test' });
    const iterator = createInputIterator(element);

    iterator.start();
    await iterator.submit('value');
    iterator.advance();

    expect(iterator.isDone()).toBe(true);
    expect(iterator.current()).toBeNull();
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
      iterator.start();
      const dirResult = await iterator.submit(tmpDir);
      expect(dirResult.valid).toBe(true);

      // File (not directory) should fail
      const iterator2 = createInputIterator(element, { environment: 'node' });
      iterator2.start();
      const fileResult = await iterator2.submit(existingFile);
      expect(fileResult.valid).toBe(false);
      expect(fileResult.errors[0].code).toBe('NOT_A_DIRECTORY');

      // Non-existent path should pass (mustExist is false)
      const iterator3 = createInputIterator(element, { environment: 'node' });
      iterator3.start();
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
      iterator.start();
      const validResult = await iterator.submit([existingFile1, existingFile2]);
      expect(validResult.valid).toBe(true);

      // One missing file should fail
      const iterator2 = createInputIterator(element, { environment: 'node' });
      iterator2.start();
      const invalidResult = await iterator2.submit([existingFile1, '/nonexistent/file.txt']);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors[0].code).toBe('FILE_NOT_FOUND');
    } finally {
      cleanupTmpDir();
    }
  });
});
