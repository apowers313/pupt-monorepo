// JSX Development Runtime for pupt-lib
// Re-exports from main runtime with development extras

export { Fragment, jsx, jsxs } from './index';

export function jsxDEV(
  type: string | symbol,
  props: Record<string, unknown>,
  _key: string | undefined,
  _isStaticChildren: boolean,
  _source: { fileName: string; lineNumber: number; columnNumber: number },
  _self: unknown,
): unknown {
  return { type, props };
}
