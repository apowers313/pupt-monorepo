// Internal symbols for element properties - prevents collision with property access

/** Symbol for element type */
export const TYPE = Symbol.for('pupt.type');

/** Symbol for element props */
export const PROPS = Symbol.for('pupt.props');

/** Symbol for element children */
export const CHILDREN = Symbol.for('pupt.children');

/** Marker for identifying deferred references (used in future phases) */
export const DEFERRED_REF = Symbol.for('pupt.deferredRef');
