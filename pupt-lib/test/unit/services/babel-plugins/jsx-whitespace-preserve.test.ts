/**
 * Tests for the jsx-whitespace-preserve Babel plugin.
 * This plugin converts JSXText nodes into expression containers to preserve whitespace.
 */
import { describe, expect, it } from 'vitest';

import { normalizeJsxText } from '../../../../src/services/babel-plugins/jsx-whitespace-preserve';
import { Transformer } from '../../../../src/services/transformer';

describe('jsx-whitespace-preserve Babel plugin', () => {
  describe('normalizeJsxText', () => {
    it('sole child: strips leading and trailing blank lines, dedents', () => {
      const result = normalizeJsxText('\n  Line one\n  Line two\n', true, true);
      expect(result).toBe('Line one\nLine two');
    });

    it('first child, element follows: strips leading blank lines, preserves trailing newline', () => {
      const result = normalizeJsxText('\n  Trip to\n  ', true, false);
      expect(result).toBe('Trip to\n');
    });

    it('middle child starting with newline: preserves leading newline and dedents', () => {
      const result = normalizeJsxText('\n  Travel dates: ', false, false);
      expect(result).toBe('\nTravel dates: ');
    });

    it('middle child continuation (no leading newline): preserves first line as-is', () => {
      const result = normalizeJsxText(' stars\n    User 2: ', false, false);
      expect(result).toBe(' stars\nUser 2: ');
    });

    it('last child, after element: whitespace-only returns null', () => {
      const result = normalizeJsxText('\n  ', false, true);
      expect(result).toBeNull();
    });

    it('inline text without newlines: returned as-is', () => {
      const result = normalizeJsxText(' to ', false, false);
      expect(result).toBe(' to ');
    });

    it('single-line sole child: returned as-is', () => {
      const result = normalizeJsxText('Hello', true, true);
      expect(result).toBe('Hello');
    });

    it('whitespace-only between elements: returns null (removed)', () => {
      const result = normalizeJsxText('\n\n', false, false);
      expect(result).toBeNull();
    });

    it('empty string: returns null', () => {
      const result = normalizeJsxText('', true, true);
      expect(result).toBeNull();
    });

    it('preserves relative indentation after dedent', () => {
      const result = normalizeJsxText('\n    Top\n      Indented\n        Deep\n', true, true);
      expect(result).toBe('Top\n  Indented\n    Deep');
    });

    it('preserves blank lines between content lines', () => {
      const result = normalizeJsxText('\n  Para one\n\n  Para two\n', true, true);
      expect(result).toBe('Para one\n\nPara two');
    });

    it('whitespace-only first child returns null', () => {
      const result = normalizeJsxText('\n  ', true, false);
      expect(result).toBeNull();
    });

    it('whitespace-only sole child returns null', () => {
      const result = normalizeJsxText('\n  \n', true, true);
      expect(result).toBeNull();
    });
  });

  describe('Transformer pipeline', () => {
    const transformer = new Transformer();

    async function transform(source: string): Promise<string> {
      return transformer.transformSourceAsync(source, 'test.tsx');
    }

    it('converts multi-line JSXText to string literal expression', async () => {
      const result = await transform(`
        export default (
          <div>
            Line one
            Line two
          </div>
        );
      `);

      expect(result).toContain('"Line one\\nLine two"');
    });

    it('preserves inline text without newlines', async () => {
      const result = await transform(`
        export default (
          <div>{"a"} to {"b"}</div>
        );
      `);

      expect(result).toContain('" to "');
    });

    it('handles text before an expression container', async () => {
      const result = await transform(`
        export default (
          <div>
            Trip to
            {"Hawaii"}
          </div>
        );
      `);

      // "Trip to\n" should be preserved with trailing newline since it's not last child
      expect(result).toContain('"Trip to\\n"');
    });

    it('handles text between expression containers', async () => {
      const result = await transform(`
        export default (
          <div>
            {"Bob"}
            Travel dates:
            {"next week"}
          </div>
        );
      `);

      // Middle text should preserve leading newline and dedent
      expect(result).toContain('Travel dates:');
    });

    it('handles single-line inline text', async () => {
      const result = await transform(`
        export default <div>Hello world</div>;
      `);

      expect(result).toContain('"Hello world"');
    });
  });
});
