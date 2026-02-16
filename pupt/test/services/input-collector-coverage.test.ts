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

import { editor,input } from '@inquirer/prompts';

import { fileSearchPrompt } from '../../src/prompts/input-types/file-search-prompt.js';
import { collectInputs } from '../../src/services/input-collector.js';

const mockedInput = vi.mocked(input);
const mockedEditor = vi.mocked(editor);
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

describe('input-collector coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('file type with default value', () => {
    it('should pass default to fileSearchPrompt for file type', async () => {
      mockedFileSearch.mockResolvedValueOnce('/selected/file.ts');

      const iter = createMockIterator([
        makeReq({
          name: 'myFile',
          label: 'Choose a file',
          type: 'file',
          default: '/initial/path.ts',
        }),
      ]);

      const values = await collectInputs(iter);

      expect(values.get('myFile')).toBe('/selected/file.ts');
      expect(mockedFileSearch).toHaveBeenCalledWith({
        message: 'Choose a file',
        basePath: undefined,
        filter: undefined,
        default: '/initial/path.ts',
      });
    });

    it('should pass default with extensions for file type', async () => {
      mockedFileSearch.mockResolvedValueOnce('/chosen/image.png');

      const iter = createMockIterator([
        makeReq({
          name: 'image',
          label: 'Pick image',
          type: 'file',
          extensions: ['png', 'jpg'],
          default: '/default/photo.png',
        }),
      ]);

      const values = await collectInputs(iter);

      expect(values.get('image')).toBe('/chosen/image.png');
      expect(mockedFileSearch).toHaveBeenCalledWith({
        message: 'Pick image',
        basePath: undefined,
        filter: '*.{png,jpg}',
        default: '/default/photo.png',
      });
    });
  });

  describe('object/array type with default value', () => {
    it('should JSON.stringify default for object type', async () => {
      mockedEditor.mockResolvedValueOnce('{"updated": true}');

      const defaultObj = { key: 'value', nested: { a: 1 } };
      const iter = createMockIterator([
        makeReq({
          name: 'config',
          label: 'Config',
          type: 'object',
          default: defaultObj,
        }),
      ]);

      const values = await collectInputs(iter);

      expect(values.get('config')).toBe('{"updated": true}');
      expect(mockedEditor).toHaveBeenCalledWith({
        message: 'Config (JSON)',
        default: JSON.stringify(defaultObj, null, 2),
      });
    });

    it('should JSON.stringify default for array type', async () => {
      mockedEditor.mockResolvedValueOnce('[1, 2, 3]');

      const defaultArr = ['apple', 'banana'];
      const iter = createMockIterator([
        makeReq({
          name: 'items',
          label: 'Items',
          type: 'array',
          default: defaultArr,
        }),
      ]);

      const values = await collectInputs(iter);

      expect(values.get('items')).toBe('[1, 2, 3]');
      expect(mockedEditor).toHaveBeenCalledWith({
        message: 'Items (JSON)',
        default: JSON.stringify(defaultArr, null, 2),
      });
    });
  });

  describe('unknown input type fallback', () => {
    it('should fall back to text input for unknown type', async () => {
      mockedInput.mockResolvedValueOnce('fallback-value');

      const iter = createMockIterator([
        makeReq({
          name: 'weird',
          label: 'Weird field',
          type: 'custom-unknown' as any,
        }),
      ]);

      const values = await collectInputs(iter);

      expect(values.get('weird')).toBe('fallback-value');
      expect(mockedInput).toHaveBeenCalledWith({
        message: 'Weird field',
        default: undefined,
      });
    });

    it('should pass default to text input for unknown type', async () => {
      mockedInput.mockResolvedValueOnce('override');

      const iter = createMockIterator([
        makeReq({
          name: 'unknown',
          label: 'Unknown',
          type: 'something-else' as any,
          default: 'fallback-default',
        }),
      ]);

      const values = await collectInputs(iter);

      expect(values.get('unknown')).toBe('override');
      expect(mockedInput).toHaveBeenCalledWith({
        message: 'Unknown',
        default: 'fallback-default',
      });
    });

    it('should use formatLabel when label is empty for unknown type', async () => {
      mockedInput.mockResolvedValueOnce('val');

      const iter = createMockIterator([
        makeReq({
          name: 'myCustomField',
          label: '',
          type: 'nonexistent-type' as any,
        }),
      ]);

      await collectInputs(iter);

      expect(mockedInput).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'My custom field' }),
      );
    });
  });
});
