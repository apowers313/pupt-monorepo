/**
 * Babel plugin that preserves newlines in multi-line JSX text content.
 *
 * Standard JSX whitespace handling collapses multi-line text into a single line
 * (like HTML). For a prompt library, newlines carry semantic meaning (e.g., bullet
 * lists, paragraphs, structured content), so they must be preserved.
 *
 * This plugin runs BEFORE the JSX transform and converts "block-like" JSXText
 * nodes into JSXExpressionContainers with string literals. Since expression
 * containers are not subject to JSX whitespace collapsing, the newlines are
 * preserved in the final output.
 *
 * A JSXText node is "block-like" when it starts with a newline AND the content
 * after its last newline is only whitespace. This identifies text that forms a
 * complete block (e.g., between opening/closing tags or between sibling elements)
 * rather than inline text mixed with expressions on the same line.
 *
 * A dedent algorithm removes common leading indentation (caused by JSX nesting)
 * while preserving relative indentation within the content.
 *
 * Transforms:
 *   <Context>          →  <Context>{"Line one\nLine two\nLine three"}</Context>
 *     Line one
 *     Line two
 *     Line three
 *   </Context>
 */

import type { PluginObj, types as BabelTypes } from '@babel/core';

/**
 * Check if a JSXText node is "block-like" content.
 *
 * Block-like means the text starts with a newline (content begins on a new line)
 * and the text after the last newline is only whitespace (content ends before
 * the closing tag or next sibling on a new line).
 *
 * This distinguishes block content like:
 *   <Tag>\n  Line 1\n  Line 2\n</Tag>     → block-like ✓
 *
 * From inline content mixed with expressions:
 *   <Tag>\n  User: </Tag>                  → NOT block-like (ends with content)
 *   <Tag> stars\n  next line\n</Tag>       → NOT block-like (starts with content)
 */
function isBlockLikeText(text: string): boolean {
  // Must start with a newline
  if (text[0] !== '\n') {
    return false;
  }

  // Content after the last newline must be empty or whitespace-only
  const lastNewlineIdx = text.lastIndexOf('\n');
  const trailing = text.slice(lastNewlineIdx + 1);
  if (trailing.trim() !== '') {
    return false;
  }

  return true;
}

/**
 * Dedent multi-line JSX text content.
 *
 * Algorithm:
 * 1. Split text into lines
 * 2. Remove leading lines that are entirely whitespace (newline after opening tag)
 * 3. Remove trailing lines that are entirely whitespace (newline before closing tag)
 * 4. Find the minimum indentation across all non-empty remaining lines
 * 5. Remove that common indentation from each line
 * 6. Join lines with newlines
 *
 * @returns The dedented text, or null if the text has no meaningful content
 */
function dedentJsxText(text: string): string | null {
  const lines = text.split('\n');

  // Remove leading whitespace-only lines
  while (lines.length > 0 && lines[0].trim() === '') {
    lines.shift();
  }

  // Remove trailing whitespace-only lines
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
    lines.pop();
  }

  if (lines.length === 0) {
    return null;
  }

  // Find minimum indentation across non-empty lines
  let minIndent = Infinity;
  for (const line of lines) {
    if (line.trim() === '') continue; // skip blank lines for indent calculation
    const match = line.match(/^(\s*)/);
    const indent = match ? match[1].length : 0;
    if (indent < minIndent) {
      minIndent = indent;
    }
  }

  if (minIndent === Infinity) {
    minIndent = 0;
  }

  // Remove common indentation from each line
  const dedented = lines.map(line => {
    if (line.trim() === '') return ''; // normalize blank lines
    return line.slice(minIndent);
  });

  return dedented.join('\n');
}

/**
 * Babel plugin that converts block-like multi-line JSXText nodes into
 * JSXExpressionContainers with string literals to preserve newlines.
 */
export function jsxNewlineLiteralPlugin({ types: t }: { types: typeof BabelTypes }): PluginObj {
  return {
    name: 'pupt-jsx-newline-literal',
    visitor: {
      JSXText(path) {
        const text = path.node.value;

        // Only process text that contains newlines
        if (!text.includes('\n')) {
          return;
        }

        // Only process text with meaningful (non-whitespace) content
        if (text.trim() === '') {
          return;
        }

        // Only process "block-like" text that starts and ends with newlines.
        // Inline text mixed with expressions (e.g., " stars\n  User 2: ")
        // should use standard JSX whitespace collapsing.
        if (!isBlockLikeText(text)) {
          return;
        }

        const dedented = dedentJsxText(text);
        if (dedented === null) {
          return;
        }

        // Replace the JSXText with a JSXExpressionContainer containing
        // a string literal. Expression containers bypass JSX whitespace
        // collapsing, so newlines are preserved.
        path.replaceWith(
          t.jsxExpressionContainer(t.stringLiteral(dedented)),
        );
      },
    },
  };
}
