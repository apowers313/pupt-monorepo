// JSX Development Runtime for pupt-lib
// Re-exports from main runtime with development extras

import type { PuptElement, PuptNode, ComponentType } from '../types';
import { jsx } from './index';

export { Fragment, jsx, jsxs } from './index';

/**
 * Source location information for development debugging
 */
export interface JSXSource {
  fileName: string;
  lineNumber: number;
  columnNumber: number;
}

/**
 * Development version of jsx that includes source location tracking.
 * Used by React/JSX transforms in development mode.
 *
 * @param type - Element type
 * @param props - Properties including children
 * @param _key - Element key (unused in pupt-lib)
 * @param _isStaticChildren - Whether children are static (unused)
 * @param _source - Source location for debugging
 * @param _self - Self reference (unused)
 * @returns A PuptElement
 */
export function jsxDEV<P extends Record<string, unknown>>(
  type: string | symbol | ComponentType<P>,
  props: P & { children?: PuptNode },
  _key: string | undefined,
  _isStaticChildren: boolean,
  _source: JSXSource,
  _self: unknown,
): PuptElement<P> {
  // In development, we could store source info for better error messages
  // For now, just delegate to the production jsx function
  return jsx(type, props);
}
