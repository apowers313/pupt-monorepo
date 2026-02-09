/**
 * Dynamic component discovery for the preprocessor and babel plugins.
 *
 * Instead of importing a static manifest from components/, this module
 * builds component lists lazily from the actual component exports.
 * src/index.ts registers a thunk that provides the exports; the lists
 * are computed on first access (at runtime, when all modules are loaded).
 */

import { isComponentClass } from '../component';

type ExportMap = Record<string, unknown>;
type ExportThunk = () => ExportMap;

let _thunk: ExportThunk | null = null;

// Lazy caches — computed on first access
let _builtinCache: string[] | null = null;
let _askCache: string[] | null = null;
let _shorthandCache: Record<string, string> | null = null;
let _structuralCache: string[] | null = null;

/**
 * Register a thunk that returns the component exports.
 * Called by src/index.ts during module initialization.
 * The thunk is evaluated lazily to avoid circular dependency issues.
 */
export function setComponentExportsThunk(thunk: ExportThunk): void {
  _thunk = thunk;
  // Invalidate caches in case of re-registration
  _builtinCache = null;
  _askCache = null;
  _shorthandCache = null;
  _structuralCache = null;
}

function getExports(): ExportMap {
  if (!_thunk) {
    throw new Error(
      'Component exports not registered. Ensure src/index.ts has been loaded.',
    );
  }
  return _thunk();
}

/**
 * All built-in non-Ask component names, derived from actual exports.
 * Includes 'Component' (the base class).
 */
export function getBuiltinComponents(): readonly string[] {
  if (!_builtinCache) {
    const exports = getExports();
    _builtinCache = ['Component'];
    for (const [name, value] of Object.entries(exports)) {
      if (name === 'Component') continue;
      if (name === 'Ask') continue;
      if (name.startsWith('Ask')) continue;
      if (isComponentClass(value)) {
        _builtinCache.push(name);
      }
    }
  }
  return _builtinCache;
}

/**
 * All Ask component names (Ask namespace + individual AskX exports).
 */
export function getAskComponents(): readonly string[] {
  if (!_askCache) {
    const exports = getExports();
    _askCache = [];
    for (const [name, value] of Object.entries(exports)) {
      if (name === 'Ask') {
        _askCache.push(name);
      } else if (name.startsWith('Ask') && isComponentClass(value)) {
        _askCache.push(name);
      }
    }
  }
  return _askCache;
}

/**
 * Shorthand aliases: short name → AskX full name.
 * e.g., { Text: 'AskText', Number: 'AskNumber', ... }
 *
 * Skips shorthands that would conflict with builtin component names.
 */
export function getAskShorthand(): Record<string, string> {
  if (!_shorthandCache) {
    const builtinSet = new Set(getBuiltinComponents());
    const askComponents = getAskComponents();
    _shorthandCache = {};
    for (const name of askComponents) {
      if (name.startsWith('Ask') && name !== 'Ask') {
        const shortName = name.slice(3);
        // Don't create shorthands that conflict with builtin names
        if (!builtinSet.has(shortName)) {
          _shorthandCache[shortName] = name;
        }
      }
    }
  }
  return _shorthandCache;
}

/**
 * Check if a component class has opted into name hoisting via `static hoistName = true`.
 */
function hasHoistName(value: unknown): boolean {
  return isComponentClass(value)
    && (value as unknown as Record<string, unknown>).hoistName === true;
}

/**
 * Structural component names whose `name` prop is for identification,
 * not variable creation. The name-hoisting Babel plugin skips these.
 *
 * Computed as: all builtins minus Component (base class), minus components
 * with `static hoistName = true`, plus Fragment.
 */
export function getStructuralComponents(): readonly string[] {
  if (!_structuralCache) {
    const exports = getExports();
    const builtins = getBuiltinComponents();
    _structuralCache = builtins.filter(name => {
      if (name === 'Component') return false;
      const value = exports[name];
      if (hasHoistName(value)) return false;
      return true;
    });
    _structuralCache.push('Fragment');
  }
  return _structuralCache;
}
