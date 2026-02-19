/**
 * Babel plugin that preserves whitespace in JSX text content.
 *
 * Standard JSX whitespace handling collapses multi-line text into a single line
 * (like HTML). For a prompt library, newlines carry semantic meaning (e.g., bullet
 * lists, paragraphs, structured content), so they must be preserved.
 *
 * This plugin runs BEFORE the JSX transform and converts ALL JSXText nodes into
 * JSXExpressionContainers with string literals. Since expression containers are
 * not subject to JSX whitespace collapsing, the whitespace is preserved in the
 * final output.
 *
 * Whitespace normalization depends on whether the text node is the first and/or
 * last child of its parent element:
 *
 * - First child: strip leading whitespace-only lines (artifact of opening tag)
 * - Last child: strip trailing whitespace-only lines (artifact of closing tag)
 * - Middle child: preserve all lines (after dedenting)
 * - No newlines: return as-is (inline text like " to ")
 *
 * A dedent algorithm removes common leading indentation (caused by JSX nesting)
 * while preserving relative indentation within the content.
 */

import type { NodePath, PluginObj, types as BabelTypes } from '@babel/core';

/**
 * Determine whether a JSXText node is the first and/or last child of its parent.
 */
function getChildPosition(path: NodePath<BabelTypes.JSXText>): { isFirst: boolean; isLast: boolean } {
  const { container } = path;
  if (!Array.isArray(container)) {
    return { isFirst: true, isLast: true };
  }
  const key = path.key as number;
  return {
    isFirst: key === 0,
    isLast: key === container.length - 1,
  };
}

/**
 * Normalize JSX text content based on its position among siblings.
 *
 * @param text - The raw JSXText value
 * @param isFirst - Whether this is the first child of the parent element
 * @param isLast - Whether this is the last child of the parent element
 * @returns The normalized text, or null if the node should be removed
 */
export function normalizeJsxText(text: string, isFirst: boolean, isLast: boolean): string | null {
  // Empty string produces nothing
  if (text === '') {
    return null;
  }

  // No newlines: return as-is (inline text like " to " or "Hello")
  if (!text.includes('\n')) {
    return text;
  }

  // Whitespace-only text (just indentation/newlines between elements): remove it
  if (text.trim() === '') {
    return null;
  }

  const lines = text.split('\n');

  // Strip leading whitespace-only lines when first child (newline after opening tag)
  if (isFirst) {
    while (lines.length > 0 && lines[0].trim() === '') {
      lines.shift();
    }
  }

  // Strip trailing whitespace-only lines when last child (newline before closing tag)
  if (isLast) {
    while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
      lines.pop();
    }
  }

  if (lines.length === 0) {
    return null;
  }

  // If the text doesn't start with \n, the first line is a continuation from
  // a previous sibling (e.g., " stars\n    User 2: " where the space before
  // "stars" is content, not indentation). Exclude it from indent calculation.
  const isContinuation = text[0] !== '\n' && !isFirst;
  const linesToMeasure = isContinuation ? lines.slice(1) : lines;

  // Find minimum indentation across non-empty lines (excluding continuation line)
  let minIndent = Infinity;
  for (const line of linesToMeasure) {
    if (line.trim() === '') { continue; }
    const match = line.match(/^(\s*)/);
    const indent = match ? match[1].length : 0;
    if (indent < minIndent) {
      minIndent = indent;
    }
  }

  if (minIndent === Infinity) {
    minIndent = 0;
  }

  // Remove common indentation from each line (skip continuation line)
  const dedented = lines.map((line, i) => {
    if (isContinuation && i === 0) { return line; }
    if (line.trim() === '') { return ''; }
    return line.slice(minIndent);
  });

  const result = dedented.join('\n');
  return result === '' ? null : result;
}

/**
 * Babel plugin that converts JSXText nodes into JSXExpressionContainers
 * with string literals to preserve whitespace.
 */
export function jsxWhitespacePreservePlugin({ types: t }: { types: typeof BabelTypes }): PluginObj {
  return {
    name: 'pupt-jsx-whitespace-preserve',
    visitor: {
      JSXText(path) {
        const text = path.node.value;
        const { isFirst, isLast } = getChildPosition(path);
        const normalized = normalizeJsxText(text, isFirst, isLast);

        if (normalized === null) {
          path.remove();
          return;
        }

        path.replaceWith(
          t.jsxExpressionContainer(t.stringLiteral(normalized)),
        );
      },
    },
  };
}
