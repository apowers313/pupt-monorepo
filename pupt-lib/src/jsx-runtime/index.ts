// JSX Runtime for pupt-lib
// This will be implemented in Phase 2

export const Fragment = Symbol.for('pupt.Fragment');

export function jsx(
  type: string | symbol,
  props: Record<string, unknown>,
): unknown {
  return { type, props };
}

export function jsxs(
  type: string | symbol,
  props: Record<string, unknown>,
): unknown {
  return jsx(type, props);
}
