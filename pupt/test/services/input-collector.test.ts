import type { InputIterator, InputRequirement, ValidationResult } from '@pupt/lib';
import { beforeEach,describe, expect, it, vi } from 'vitest';

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

import { checkbox, confirm, editor, input, password,select } from '@inquirer/prompts';

import { fileSearchPrompt } from '../../src/prompts/input-types/file-search-prompt.js';
import { collectInputs } from '../../src/services/input-collector.js';

const mockedInput = vi.mocked(input);
const mockedSelect = vi.mocked(select);
const mockedConfirm = vi.mocked(confirm);
const mockedEditor = vi.mocked(editor);
const mockedCheckbox = vi.mocked(checkbox);
const mockedPassword = vi.mocked(password);
const mockedFileSearch = vi.mocked(fileSearchPrompt);

function createMockIterator(requirements: InputRequirement[]): InputIterator {
  let index = -1;
  const values = new Map<string, unknown>();

  return {
    start() { index = 0; },
    current(): InputRequirement | null {
      return index < requirements.length ? requirements[index] : null;
    },
    async submit(value: unknown): Promise<ValidationResult> {
      if (index < requirements.length) {
        values.set(requirements[index].name, value);
      }
      return { valid: true, errors: [], warnings: [] };
    },
    advance() { index++; },
    isDone(): boolean { return index >= requirements.length; },
    getValues(): Map<string, unknown> { return values; },
  };
}

function makeReq(overrides: Partial<InputRequirement> & { name: string }): InputRequirement {
  return {
    label: '',
    description: '',
    type: 'string',
    required: true,
    ...overrides,
  };
}

describe('collectInputs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('interactive mode', () => {
    it('should collect a single string input', async () => {
      mockedInput.mockResolvedValueOnce('Alice');

      const iter = createMockIterator([
        makeReq({ name: 'userName', label: 'Your name', type: 'string' }),
      ]);

      const values = await collectInputs(iter);
      expect(values.get('userName')).toBe('Alice');
      expect(mockedInput).toHaveBeenCalledWith({
        message: 'Your name',
        default: undefined,
      });
    });

    it('should collect multiple inputs in order', async () => {
      mockedInput.mockResolvedValueOnce('Alice');
      mockedInput.mockResolvedValueOnce('Testing');

      const iter = createMockIterator([
        makeReq({ name: 'name', label: 'Name', type: 'string' }),
        makeReq({ name: 'topic', label: 'Topic', type: 'string' }),
      ]);

      const values = await collectInputs(iter);
      expect(values.get('name')).toBe('Alice');
      expect(values.get('topic')).toBe('Testing');
      expect(mockedInput).toHaveBeenCalledTimes(2);
    });

    it('should handle empty iterator', async () => {
      const iter = createMockIterator([]);
      const values = await collectInputs(iter);
      expect(values.size).toBe(0);
    });

    it('should use default values in prompt config', async () => {
      mockedInput.mockResolvedValueOnce('world');

      const iter = createMockIterator([
        makeReq({ name: 'greeting', label: 'Greeting', type: 'string', default: 'hello' }),
      ]);

      await collectInputs(iter);
      expect(mockedInput).toHaveBeenCalledWith({
        message: 'Greeting',
        default: 'hello',
      });
    });

    it('should format label from name when label is empty', async () => {
      mockedInput.mockResolvedValueOnce('val');

      const iter = createMockIterator([
        makeReq({ name: 'userName', label: '', type: 'string' }),
      ]);

      await collectInputs(iter);
      expect(mockedInput).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'User name' }),
      );
    });
  });

  describe('input type mapping', () => {
    it('should map number type to input with validation', async () => {
      mockedInput.mockResolvedValueOnce('42');

      const iter = createMockIterator([
        makeReq({ name: 'age', label: 'Age', type: 'number' }),
      ]);

      const values = await collectInputs(iter);
      expect(values.get('age')).toBe(42);
      expect(mockedInput).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Age' }),
      );
    });

    it('should map boolean type to confirm', async () => {
      mockedConfirm.mockResolvedValueOnce(true);

      const iter = createMockIterator([
        makeReq({ name: 'proceed', label: 'Continue?', type: 'boolean', default: false }),
      ]);

      const values = await collectInputs(iter);
      expect(values.get('proceed')).toBe(true);
      expect(mockedConfirm).toHaveBeenCalledWith({
        message: 'Continue?',
        default: false,
      });
    });

    it('should map select type to select with options', async () => {
      mockedSelect.mockResolvedValueOnce('ts');

      const iter = createMockIterator([
        makeReq({
          name: 'lang',
          label: 'Language',
          type: 'select',
          options: [
            { value: 'ts', label: 'TypeScript' },
            { value: 'js', label: 'JavaScript' },
          ],
        }),
      ]);

      const values = await collectInputs(iter);
      expect(values.get('lang')).toBe('ts');
      expect(mockedSelect).toHaveBeenCalledWith({
        message: 'Language',
        choices: [
          { value: 'ts', name: 'TypeScript' },
          { value: 'js', name: 'JavaScript' },
        ],
        default: undefined,
      });
    });

    it('should map multiselect type to checkbox', async () => {
      mockedCheckbox.mockResolvedValueOnce(['a', 'c']);

      const iter = createMockIterator([
        makeReq({
          name: 'features',
          label: 'Features',
          type: 'multiselect',
          options: [
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' },
            { value: 'c', label: 'C' },
          ],
        }),
      ]);

      const values = await collectInputs(iter);
      expect(values.get('features')).toEqual(['a', 'c']);
      expect(mockedCheckbox).toHaveBeenCalled();
    });

    it('should map secret type to password', async () => {
      mockedPassword.mockResolvedValueOnce('s3cret');

      const iter = createMockIterator([
        makeReq({ name: 'apiKey', label: 'API Key', type: 'secret' }),
      ]);

      const values = await collectInputs(iter);
      expect(values.get('apiKey')).toBe('s3cret');
      expect(mockedPassword).toHaveBeenCalledWith({ message: 'API Key' });
    });

    it('should map file type to fileSearchPrompt', async () => {
      mockedFileSearch.mockResolvedValueOnce('/path/to/file.ts');

      const iter = createMockIterator([
        makeReq({
          name: 'sourceFile',
          label: 'Source file',
          type: 'file',
          extensions: ['ts', 'tsx'],
        }),
      ]);

      const values = await collectInputs(iter);
      expect(values.get('sourceFile')).toBe('/path/to/file.ts');
      expect(mockedFileSearch).toHaveBeenCalledWith({
        message: 'Source file',
        basePath: undefined,
        filter: '*.{ts,tsx}',
        default: undefined,
      });
    });

    it('should map path type to fileSearchPrompt', async () => {
      mockedFileSearch.mockResolvedValueOnce('/some/dir');

      const iter = createMockIterator([
        makeReq({ name: 'outputDir', label: 'Output directory', type: 'path' }),
      ]);

      const values = await collectInputs(iter);
      expect(values.get('outputDir')).toBe('/some/dir');
      expect(mockedFileSearch).toHaveBeenCalled();
    });

    it('should map rating type to select with numeric choices', async () => {
      mockedSelect.mockResolvedValueOnce('4');

      const iter = createMockIterator([
        makeReq({
          name: 'score',
          label: 'Rating',
          type: 'rating',
          min: 1,
          max: 5,
        }),
      ]);

      const values = await collectInputs(iter);
      expect(values.get('score')).toBe(4);
      expect(mockedSelect).toHaveBeenCalledWith({
        message: 'Rating',
        choices: [
          { value: '1', name: '1' },
          { value: '2', name: '2' },
          { value: '3', name: '3' },
          { value: '4', name: '4' },
          { value: '5', name: '5' },
        ],
      });
    });

    it('should map rating type with custom labels', async () => {
      mockedSelect.mockResolvedValueOnce('3');

      const iter = createMockIterator([
        makeReq({
          name: 'score',
          label: 'How was it?',
          type: 'rating',
          min: 1,
          max: 3,
          labels: { 1: 'Bad', 2: 'OK', 3: 'Great' },
        }),
      ]);

      const values = await collectInputs(iter);
      expect(mockedSelect).toHaveBeenCalledWith({
        message: 'How was it?',
        choices: [
          { value: '1', name: 'Bad' },
          { value: '2', name: 'OK' },
          { value: '3', name: 'Great' },
        ],
      });
    });

    it('should map string type with language key to editor (Ask.Editor)', async () => {
      mockedEditor.mockResolvedValueOnce('multi-line content here');

      // Ask.Editor always includes the language key, even when undefined
      const iter = createMockIterator([
        makeReq({ name: 'prompt', label: 'Prompt', type: 'string', language: undefined } as InputRequirement),
      ]);

      const values = await collectInputs(iter);
      expect(values.get('prompt')).toBe('multi-line content here');
      expect(mockedEditor).toHaveBeenCalledWith({
        message: 'Prompt',
        default: undefined,
      });
      expect(mockedInput).not.toHaveBeenCalled();
    });

    it('should map string type with explicit language to editor (Ask.Editor)', async () => {
      mockedEditor.mockResolvedValueOnce('const x = 1;');

      const iter = createMockIterator([
        makeReq({ name: 'code', label: 'Code', type: 'string', language: 'javascript' } as InputRequirement),
      ]);

      const values = await collectInputs(iter);
      expect(values.get('code')).toBe('const x = 1;');
      expect(mockedEditor).toHaveBeenCalledWith({
        message: 'Code',
        default: undefined,
      });
      expect(mockedInput).not.toHaveBeenCalled();
    });

    it('should map string type without language key to text input (Ask.Text)', async () => {
      mockedInput.mockResolvedValueOnce('simple text');

      // Ask.Text does NOT include the language key
      const iter = createMockIterator([
        makeReq({ name: 'title', label: 'Title', type: 'string' }),
      ]);

      const values = await collectInputs(iter);
      expect(values.get('title')).toBe('simple text');
      expect(mockedInput).toHaveBeenCalledWith({
        message: 'Title',
        default: undefined,
      });
      expect(mockedEditor).not.toHaveBeenCalled();
    });

    it('should map object type to editor', async () => {
      mockedEditor.mockResolvedValueOnce('{"key": "value"}');

      const iter = createMockIterator([
        makeReq({ name: 'config', label: 'Config', type: 'object' }),
      ]);

      const values = await collectInputs(iter);
      expect(values.get('config')).toBe('{"key": "value"}');
      expect(mockedEditor).toHaveBeenCalledWith({
        message: 'Config (JSON)',
        default: undefined,
      });
    });

    it('should map date type to text input', async () => {
      mockedInput.mockResolvedValueOnce('2025-01-15');

      const iter = createMockIterator([
        makeReq({ name: 'startDate', label: 'Start date', type: 'date' }),
      ]);

      const values = await collectInputs(iter);
      expect(values.get('startDate')).toBe('2025-01-15');
    });
  });

  describe('no-interactive mode', () => {
    it('should use default values without prompting', async () => {
      const iter = createMockIterator([
        makeReq({ name: 'name', label: 'Name', type: 'string', default: 'World' }),
      ]);

      const values = await collectInputs(iter, true);
      expect(values.get('name')).toBe('World');
      expect(mockedInput).not.toHaveBeenCalled();
    });

    it('should throw when required field has no default', async () => {
      const iter = createMockIterator([
        makeReq({ name: 'name', label: 'Name', type: 'string', required: true }),
      ]);

      await expect(collectInputs(iter, true)).rejects.toThrow(
        "No default value for 'name' - cannot run in non-interactive mode",
      );
    });

    it('should use empty string for non-required fields without default', async () => {
      const iter = createMockIterator([
        makeReq({ name: 'optional', label: 'Optional', type: 'string', required: false }),
      ]);

      const values = await collectInputs(iter, true);
      expect(values.get('optional')).toBe('');
    });

    it('should handle multiple defaults', async () => {
      const iter = createMockIterator([
        makeReq({ name: 'a', label: 'A', type: 'string', default: 'alpha' }),
        makeReq({ name: 'b', label: 'B', type: 'boolean', default: true }),
      ]);

      const values = await collectInputs(iter, true);
      expect(values.get('a')).toBe('alpha');
      expect(values.get('b')).toBe(true);
    });
  });

  describe('validation', () => {
    it('should re-prompt when validation fails then succeeds', async () => {
      mockedInput.mockResolvedValueOnce('bad');
      mockedInput.mockResolvedValueOnce('good');

      let submitCount = 0;
      const reqs: InputRequirement[] = [
        makeReq({ name: 'val', label: 'Value', type: 'string' }),
      ];

      const iter: InputIterator = {
        start() { /* noop */ },
        current() { return submitCount < 2 ? reqs[0] : null; },
        async submit(value: unknown) {
          submitCount++;
          if (value === 'bad') {
            return { valid: false, errors: [{ field: 'val', message: 'bad value', code: 'invalid' }], warnings: [] };
          }
          return { valid: true, errors: [], warnings: [] };
        },
        advance() { /* noop */ },
        isDone() { return submitCount >= 2; },
        getValues() { return new Map([['val', 'good']]); },
      };

      const values = await collectInputs(iter);
      expect(values.get('val')).toBe('good');
      expect(mockedInput).toHaveBeenCalledTimes(2);
    });
  });
});
