import { describe, it, expect } from 'vitest';
import { render, Component } from '../../src';
import { jsx, Fragment } from '../../src/jsx-runtime';
import { z } from 'zod';
import { AskText, AskNumber, AskSelect, AskConfirm, AskMultiSelect, AskRating, AskEditor, AskFile, AskPath, AskDate, AskSecret, AskChoice, AskReviewFile } from '../../src/components/ask';

describe('Ask components with resolve()', () => {
  describe('Ask.Text', () => {
    it('should resolve to input value', async () => {
      const result = await render(
        jsx(AskText, { name: 'username', label: 'Username', default: 'default-value' }),
        { inputs: new Map([['username', 'Alice']]) },
      );
      expect(result.text).toBe('Alice');
    });

    it('should resolve to default when no input provided', async () => {
      const result = await render(
        jsx(AskText, { name: 'username', label: 'Username', default: 'default-value' }),
        { inputs: new Map() },
      );
      expect(result.text).toBe('default-value');
    });
  });

  describe('Ask.Number', () => {
    it('should resolve to number from input', async () => {
      const result = await render(
        jsx(AskNumber, { name: 'count', label: 'Count', default: 0 }),
        { inputs: new Map([['count', 42]]) },
      );
      expect(result.text).toBe('42');
    });

    it('should resolve to default when no input provided', async () => {
      const result = await render(
        jsx(AskNumber, { name: 'count', label: 'Count', default: 10 }),
        { inputs: new Map() },
      );
      expect(result.text).toBe('10');
    });
  });

  describe('Ask.Select', () => {
    it('should resolve to selected option', async () => {
      const result = await render(
        jsx(AskSelect, { name: 'choice', label: 'Choice', options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }, { value: 'c', label: 'C' }] }),
        { inputs: new Map([['choice', 'b']]) },
      );
      expect(result.text).toBe('B');
    });
  });

  describe('Ask.Confirm', () => {
    it('should resolve to boolean true', async () => {
      const result = await render(
        jsx(AskConfirm, { name: 'agree', label: 'Agree?' }),
        { inputs: new Map([['agree', true]]) },
      );
      expect(result.text).toBe('Yes');
    });

    it('should resolve to boolean false', async () => {
      const result = await render(
        jsx(AskConfirm, { name: 'agree', label: 'Agree?' }),
        { inputs: new Map([['agree', false]]) },
      );
      expect(result.text).toBe('No');
    });
  });

  describe('Ask.MultiSelect', () => {
    it('should resolve to array of selected options', async () => {
      const result = await render(
        jsx(AskMultiSelect, { name: 'items', label: 'Items', options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }, { value: 'c', label: 'C' }] }),
        { inputs: new Map([['items', ['a', 'c']]]) },
      );
      expect(result.text).toBe('A, C');
    });
  });

  describe('Ask.Rating', () => {
    it('should resolve to number rating', async () => {
      const result = await render(
        jsx(AskRating, { name: 'rating', label: 'Rating' }),
        { inputs: new Map([['rating', 4]]) },
      );
      expect(result.text).toBe('4');
    });
  });

  describe('Ask.Editor', () => {
    it('should resolve to editor content', async () => {
      const result = await render(
        jsx(AskEditor, { name: 'content', label: 'Content' }),
        { inputs: new Map([['content', 'Hello World']]) },
      );
      expect(result.text).toBe('Hello World');
    });
  });

  describe('Ask.File', () => {
    it('should resolve to single file path', async () => {
      const result = await render(
        jsx(AskFile, { name: 'file', label: 'File' }),
        { inputs: new Map([['file', '/path/to/file.txt']]) },
      );
      expect(result.text).toBe('/path/to/file.txt');
    });

    it('should resolve to multiple file paths', async () => {
      const result = await render(
        jsx(AskFile, { name: 'files', label: 'Files', multiple: true }),
        { inputs: new Map([['files', ['/path/a.txt', '/path/b.txt']]]) },
      );
      expect(result.text).toBe('/path/a.txt, /path/b.txt');
    });
  });

  describe('Ask.Path', () => {
    it('should resolve to path', async () => {
      const result = await render(
        jsx(AskPath, { name: 'path', label: 'Path' }),
        { inputs: new Map([['path', '/some/path']]) },
      );
      expect(result.text).toBe('/some/path');
    });
  });

  describe('Ask.Date', () => {
    it('should resolve to date string', async () => {
      const result = await render(
        jsx(AskDate, { name: 'date', label: 'Date' }),
        { inputs: new Map([['date', '2024-01-15']]) },
      );
      expect(result.text).toBe('2024-01-15');
    });
  });

  describe('Ask.Secret', () => {
    it('should resolve to secret value', async () => {
      const result = await render(
        jsx(AskSecret, { name: 'apiKey', label: 'API Key' }),
        { inputs: new Map([['apiKey', 'secret123']]) },
      );
      expect(result.text).toBe('secret123');
    });
  });

  describe('Ask.Choice', () => {
    it('should resolve to selected choice', async () => {
      const result = await render(
        jsx(AskChoice, { name: 'yesNo', label: 'Yes or No', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }] }),
        { inputs: new Map([['yesNo', 'yes']]) },
      );
      expect(result.text).toBe('Yes');
    });
  });

  describe('Ask.ReviewFile', () => {
    it('should resolve to file path', async () => {
      const result = await render(
        jsx(AskReviewFile, { name: 'reviewFile', label: 'Review File' }),
        { inputs: new Map([['reviewFile', '/path/to/review.txt']]) },
      );
      expect(result.text).toBe('/path/to/review.txt');
    });
  });

  describe('Ask value passing to other components', () => {
    it('should pass Ask value to another component', async () => {
      class Greeter extends Component<{ name: string }> {
        static schema = z.object({ name: z.unknown() });

        render({ name }: { name: string }) {
          return `Hello, ${name}!`;
        }
      }

      const askText = jsx(AskText, { name: 'username', label: 'Username', default: 'World' });
      const greeter = jsx(Greeter, { name: askText as unknown as string });
      const prompt = jsx(Fragment, { children: [askText, greeter] });

      const result = await render(prompt, {
        inputs: new Map([['username', 'Alice']]),
      });
      // Both components render their output
      expect(result.text).toContain('Hello, Alice!');
    });

    it('should pass Ask.Number value to component expecting number', async () => {
      class Multiplier extends Component<{ value: number }> {
        static schema = z.object({ value: z.unknown() });

        render({ value }: { value: number }) {
          return `Result: ${value * 2}`;
        }
      }

      const askNumber = jsx(AskNumber, { name: 'num', label: 'Number', default: 5 });
      const multiplier = jsx(Multiplier, { value: askNumber as unknown as number });
      const prompt = jsx(Fragment, { children: [askNumber, multiplier] });

      const result = await render(prompt, {
        inputs: new Map([['num', 10]]),
      });
      expect(result.text).toContain('Result: 20');
    });

    it('should pass Ask.Confirm value to component expecting boolean', async () => {
      class Conditional extends Component<{ enabled: boolean }> {
        static schema = z.object({ enabled: z.unknown() });

        render({ enabled }: { enabled: boolean }) {
          return enabled ? 'Feature ON' : 'Feature OFF';
        }
      }

      const askConfirm = jsx(AskConfirm, { name: 'toggle', label: 'Enable?', default: false });
      const conditional = jsx(Conditional, { enabled: askConfirm as unknown as boolean });
      const prompt = jsx(Fragment, { children: [askConfirm, conditional] });

      const result = await render(prompt, {
        inputs: new Map([['toggle', true]]),
      });
      expect(result.text).toContain('Feature ON');
    });

    it('should pass Ask.MultiSelect value to component expecting array', async () => {
      class ListRenderer extends Component<{ items: string[] }> {
        static schema = z.object({ items: z.unknown() });

        render({ items }: { items: string[] }) {
          return `Selected: ${items.length} items`;
        }
      }

      const askMulti = jsx(AskMultiSelect, {
        name: 'choices',
        label: 'Choices',
        options: [{ value: 'a' }, { value: 'b' }, { value: 'c' }],
      });
      const listRenderer = jsx(ListRenderer, { items: askMulti as unknown as string[] });
      const prompt = jsx(Fragment, { children: [askMulti, listRenderer] });

      const result = await render(prompt, {
        inputs: new Map([['choices', ['a', 'b']]]),
      });
      expect(result.text).toContain('Selected: 2 items');
    });
  });
});
