import type { PuptNode } from '../types';

/**
 * Wrap content with a delimiter (XML tags, markdown header, or none).
 * This is the shared utility that replaces the duplicated switch(delimiter)
 * logic across structural components.
 *
 * @param content - The content to wrap (string or array of PuptNode)
 * @param tag - The tag/heading name to use
 * @param delimiter - The delimiter style: 'xml', 'markdown', or 'none'
 * @returns The wrapped content as a PuptNode
 */
export function wrapWithDelimiter(
  content: PuptNode,
  tag: string,
  delimiter: 'xml' | 'markdown' | 'none',
): PuptNode {
  switch (delimiter) {
    case 'xml':
      return [`<${tag}>\n`, content, `\n</${tag}>\n`];
    case 'markdown':
      return [`## ${tag}\n\n`, content];
    case 'none':
      return content;
  }
}
