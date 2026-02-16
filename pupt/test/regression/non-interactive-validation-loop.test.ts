import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { InputIterator, InputRequirement, ValidationResult } from 'pupt-lib';

// Mock @inquirer/prompts
vi.mock('@inquirer/prompts', () => ({
  input: vi.fn(),
  select: vi.fn(),
  confirm: vi.fn(),
  editor: vi.fn(),
  checkbox: vi.fn(),
  password: vi.fn(),
}));

// Mock file search prompt
vi.mock('../../src/prompts/input-types/file-search-prompt.js', () => ({
  fileSearchPrompt: vi.fn(),
}));

// Mock review file prompt
vi.mock('../../src/prompts/input-types/review-file-prompt.js', () => ({
  reviewFilePrompt: vi.fn(),
}));

import { collectInputs } from '../../src/services/input-collector.js';

function makeReq(overrides: Partial<InputRequirement> & { name: string }): InputRequirement {
  return {
    label: '',
    description: '',
    type: 'string',
    required: true,
    ...overrides,
  };
}

/**
 * Regression test for: non-interactive mode infinite loop when validation fails.
 *
 * When running in --no-interactive mode, if the iterator's submit() returns
 * valid: false for a default value, the input collector would retry with the
 * same default forever, creating an infinite loop. This happens in practice
 * when pupt-lib's file extension validator rejects a valid file because it
 * compares ".ts" (with dot) against "ts" (without dot).
 *
 * The fix: throw an error in non-interactive mode when validation fails,
 * since retrying with the same default will always produce the same result.
 */
describe('non-interactive validation failure should not loop forever', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw when validation always fails in non-interactive mode', async () => {
    const req = makeReq({
      name: 'sourceFile',
      label: 'Source file',
      type: 'file',
      extensions: ['ts', 'tsx'],
      default: 'src/cli.ts',
    });

    let submitCount = 0;
    const iter: InputIterator = {
      start() { /* noop */ },
      current() { return req; },
      async submit(_value: unknown): Promise<ValidationResult> {
        submitCount++;
        // Simulate pupt-lib's extension mismatch: ".ts" !== "ts"
        return {
          valid: false,
          errors: [{ field: 'sourceFile', message: 'File has invalid extension ".ts". Allowed: ts, tsx', code: 'INVALID_EXTENSION' }],
          warnings: [],
        };
      },
      advance() { /* noop */ },
      isDone() { return false; },
      getValues() { return new Map(); },
    };

    await expect(collectInputs(iter, true)).rejects.toThrow(
      /Validation failed.*sourceFile.*non-interactive/,
    );

    // Should have only tried once, not looped
    expect(submitCount).toBe(1);
  });

  it('should throw with all validation error details', async () => {
    const req = makeReq({
      name: 'targetFile',
      label: 'Target',
      type: 'file',
      default: '/missing/file.py',
    });

    const iter: InputIterator = {
      start() { /* noop */ },
      current() { return req; },
      async submit(_value: unknown): Promise<ValidationResult> {
        return {
          valid: false,
          errors: [
            { field: 'targetFile', message: 'File does not exist', code: 'FILE_NOT_FOUND' },
          ],
          warnings: [],
        };
      },
      advance() { /* noop */ },
      isDone() { return false; },
      getValues() { return new Map(); },
    };

    await expect(collectInputs(iter, true)).rejects.toThrow('File does not exist');
  });

  it('should still allow retry in interactive mode when validation fails', async () => {
    // Import the mocked module
    const { input } = await import('@inquirer/prompts');
    const mockedInput = vi.mocked(input);

    // First attempt returns bad value, second returns good value
    mockedInput.mockResolvedValueOnce('bad');
    mockedInput.mockResolvedValueOnce('good');

    let submitCount = 0;
    const req = makeReq({ name: 'val', label: 'Value', type: 'string' });

    const iter: InputIterator = {
      start() { /* noop */ },
      current() { return submitCount < 2 ? req : null; },
      async submit(value: unknown): Promise<ValidationResult> {
        submitCount++;
        if (value === 'bad') {
          return { valid: false, errors: [{ field: 'val', message: 'bad', code: 'invalid' }], warnings: [] };
        }
        return { valid: true, errors: [], warnings: [] };
      },
      advance() { /* noop */ },
      isDone() { return submitCount >= 2; },
      getValues() { return new Map([['val', 'good']]); },
    };

    // Interactive mode should still retry (not throw)
    const values = await collectInputs(iter, false);
    expect(values.get('val')).toBe('good');
    expect(submitCount).toBe(2);
  });
});
