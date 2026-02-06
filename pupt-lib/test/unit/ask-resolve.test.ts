import { describe, it, expect } from 'vitest';
import { render, Component, If } from '../../src';
import { jsx, Fragment } from '../../src/jsx-runtime';
import { z } from 'zod';
import { AskText, AskNumber, AskSelect, AskConfirm, AskMultiSelect, AskRating, AskEditor, AskFile, AskPath, AskDate, AskSecret, AskChoice, AskReviewFile } from '../../src/components/ask';
import { COMPONENT_MARKER, isComponentClass } from '../../src/component';
import { TYPE, PROPS, CHILDREN } from '../../src/types/symbols';

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

  describe('Ask default values seeded into context.inputs', () => {
    it('should seed Confirm default into inputs so If formula resolves (issue #16)', async () => {
      const element = jsx(Fragment, {
        children: [
          jsx(AskConfirm, { name: 'includeCode', label: 'Include code?', silent: true }),
          jsx(If, { when: '=includeCode', children: 'TRUTHY_BRANCH' }),
          jsx(If, { when: '=NOT(includeCode)', children: 'FALSY_BRANCH' }),
        ],
      });

      const result = await render(element, { inputs: new Map() });
      expect(result.text).toContain('FALSY_BRANCH');
      expect(result.text).not.toContain('TRUTHY_BRANCH');
    });

    it('should seed Confirm explicit true default into inputs', async () => {
      const element = jsx(Fragment, {
        children: [
          jsx(AskConfirm, { name: 'includeCode', label: 'Include code?', default: true, silent: true }),
          jsx(If, { when: '=includeCode', children: 'TRUTHY_BRANCH' }),
          jsx(If, { when: '=NOT(includeCode)', children: 'FALSY_BRANCH' }),
        ],
      });

      const result = await render(element, { inputs: new Map() });
      expect(result.text).toContain('TRUTHY_BRANCH');
      expect(result.text).not.toContain('FALSY_BRANCH');
    });

    it('should seed Text default into inputs for If formula', async () => {
      const element = jsx(Fragment, {
        children: [
          jsx(AskText, { name: 'lang', label: 'Language', default: 'python', silent: true }),
          jsx(If, { when: '=lang="python"', children: 'python-branch' }),
        ],
      });

      const result = await render(element, { inputs: new Map() });
      expect(result.text).toContain('python-branch');
    });

    it('should seed Number default into inputs for If formula', async () => {
      const element = jsx(Fragment, {
        children: [
          jsx(AskNumber, { name: 'count', label: 'Count', default: 10, silent: true }),
          jsx(If, { when: '=count>5', children: 'many-items' }),
        ],
      });

      const result = await render(element, { inputs: new Map() });
      expect(result.text).toContain('many-items');
    });

    it('should seed Select default into inputs for If formula', async () => {
      const element = jsx(Fragment, {
        children: [
          jsx(AskSelect, {
            name: 'format',
            label: 'Format',
            default: 'json',
            options: [{ value: 'json', label: 'JSON' }, { value: 'xml', label: 'XML' }],
            silent: true,
          }),
          jsx(If, { when: '=format="json"', children: 'json-branch' }),
        ],
      });

      const result = await render(element, { inputs: new Map() });
      expect(result.text).toContain('json-branch');
    });

    it('should not overwrite explicit input values with defaults', async () => {
      const element = jsx(Fragment, {
        children: [
          jsx(AskConfirm, { name: 'includeCode', label: 'Include code?', silent: true }),
          jsx(If, { when: '=includeCode', children: 'TRUTHY_BRANCH' }),
          jsx(If, { when: '=NOT(includeCode)', children: 'FALSY_BRANCH' }),
        ],
      });

      const result = await render(element, { inputs: new Map([['includeCode', true]]) });
      expect(result.text).toContain('TRUTHY_BRANCH');
      expect(result.text).not.toContain('FALSY_BRANCH');
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

describe('Dual-package resilience (issue #16 comment)', () => {
  it('COMPONENT_MARKER should be a global registry symbol', () => {
    // COMPONENT_MARKER must use Symbol.for() so it works across multiple copies
    // of pupt-lib loaded in the same runtime (e.g., via import maps in browser).
    // A local Symbol("component") would be unique per module instance, breaking
    // isComponentClass checks across copies.
    expect(COMPONENT_MARKER).toBe(Symbol.for('pupt-lib:component:v1'));
  });

  it('isComponentClass should recognize a "foreign" component using the global marker', () => {
    // Simulate a component class from a different copy of pupt-lib.
    // It uses Symbol.for() to get the same global marker symbol.
    class ForeignComponent {
      static [Symbol.for('pupt-lib:component:v1')] = true;
    }
    expect(isComponentClass(ForeignComponent)).toBe(true);
  });

  it('seedAskDefaults should seed implicitDefault from a simulated foreign AskConfirm', async () => {
    // Simulate a dual-package scenario: create an element tree manually using
    // global symbols (as a "foreign" copy of pupt-lib would) with a component
    // class that has implicitDefault but comes from a different module copy.
    class ForeignAskConfirm {
      static [Symbol.for('pupt-lib:component:v1')] = true;
      static implicitDefault = false;
      static schema = z.object({
        name: z.string(),
        label: z.string(),
        silent: z.boolean().optional(),
      }).passthrough();

      resolve(props: { name: string; default?: boolean }, context: { inputs: Map<string, unknown> }): boolean {
        const value = context.inputs.get(props.name);
        if (value !== undefined) return Boolean(value);
        return props.default ?? false;
      }

      render(): string {
        return '';
      }
    }

    // Build element tree using global symbols (simulating "foreign" copy)
    const foreignAskElement = {
      [TYPE]: ForeignAskConfirm,
      [PROPS]: { name: 'includeCode', label: 'Include code?', silent: true },
      [CHILDREN]: [],
    };

    const element = jsx(Fragment, {
      children: [
        foreignAskElement,
        jsx(If, { when: '=includeCode', children: 'TRUTHY_BRANCH' }),
        jsx(If, { when: '=NOT(includeCode)', children: 'FALSY_BRANCH' }),
      ],
    });

    const result = await render(element, { inputs: new Map() });
    // The foreign AskConfirm's implicitDefault (false) should be seeded,
    // so the NOT(includeCode) branch should render.
    expect(result.text).toContain('FALSY_BRANCH');
    expect(result.text).not.toContain('TRUTHY_BRANCH');
  });

  it('element symbols (TYPE, PROPS, CHILDREN) should be global registry symbols', () => {
    // These symbols must use Symbol.for() so elements created by one copy
    // of pupt-lib can be processed by another copy.
    expect(TYPE).toBe(Symbol.for('pupt.type'));
    expect(PROPS).toBe(Symbol.for('pupt.props'));
    expect(CHILDREN).toBe(Symbol.for('pupt.children'));
  });
});
