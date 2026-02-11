/**
 * Type export regression tests (issue #17).
 *
 * Verifies that dist/index.d.ts actually exports all public API types and values.
 * When rollupTypes bundles declarations into a single file, it can silently drop
 * export keywords, making types invisible to TypeScript consumers even though
 * runtime exports work fine.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

describe('Type Declaration Exports (issue #17)', () => {
  let dtsContent: string;
  const dtsPath = resolve(__dirname, '../../dist/src/index.d.ts');

  beforeAll(() => {
    if (!existsSync(dtsPath)) {
      throw new Error('dist/src/index.d.ts not found. Run `npm run build` first.');
    }
    dtsContent = readFileSync(dtsPath, 'utf-8');
  });

  /**
   * Extract all exported identifiers from a .d.ts file.
   * Handles:
   *   - `export declare function foo`
   *   - `export declare const foo`
   *   - `export declare class foo`
   *   - `export declare abstract class foo`
   *   - `export declare type foo`
   *   - `export declare interface foo`
   *   - `export declare enum foo`
   *   - `export type { Foo, Bar }` (re-exports)
   *   - `export { Foo, Bar }` (re-exports)
   */
  function getExportedNames(content: string): Set<string> {
    const names = new Set<string>();

    // export declare (function|const|let|var|class|abstract class|type|interface|enum) NAME
    const declarePattern = /export\s+declare\s+(?:abstract\s+)?(?:function|const|let|var|class|type|interface|enum)\s+(\w+)/g;
    let match;
    while ((match = declarePattern.exec(content)) !== null) {
      names.add(match[1]);
    }

    // export { Name1, Name2 } or export type { Name1, Name2 }
    const reExportPattern = /export\s+(?:type\s+)?\{([^}]+)\}/g;
    while ((match = reExportPattern.exec(content)) !== null) {
      const inner = match[1];
      for (const part of inner.split(',')) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        // Handle `Foo as Bar` - take the exported name (Bar)
        const asMatch = trimmed.match(/\w+\s+as\s+(\w+)/);
        names.add(asMatch ? asMatch[1] : trimmed);
      }
    }

    return names;
  }

  describe('value exports', () => {
    const expectedValues = [
      'render',
      'Component',
      'COMPONENT_MARKER',
      'TYPE',
      'PROPS',
      'CHILDREN',
      'DEFERRED_REF',
      'isPuptElement',
      'isDeferredRef',
      'VERSION',
      'LLM_PROVIDERS',
      'inferProviderFromModel',
      'DEFAULT_ENVIRONMENT',
      'createEnvironment',
      'createRuntimeConfig',
      'isComponentClass',
      'wrapWithDelimiter',
      'findChildrenOfType',
      'partitionChildren',
      'isElementOfType',
      'createInputIterator',
      'evaluateFormula',
      'Transformer',
      'evaluateModule',
      'preprocessSource',
      'isPromptFile',
      'needsPreprocessing',
      'createPromptFromSource',
      'createPrompt',
      'Pupt',
      'createSearchEngine',
      'FileSearchEngine',
      'createFileSearchEngine',
      'loadNodeModules',
      'getBuiltinComponents',
      'getAskComponents',
      'getAskShorthand',
      'getStructuralComponents',
      'ModuleLoader',
      'resolveCdn',
      'generateImportMap',
      'serializeImportMap',
      'generateImportMapScript',
      'generatePuptLibImportMap',
      'generatePuptLibImportMapScript',
      'askBaseSchema',
      'attachRequirement',
    ];

    for (const name of expectedValues) {
      it(`should export value "${name}"`, () => {
        const exports = getExportedNames(dtsContent);
        expect(exports.has(name)).toBe(true);
      });
    }
  });

  describe('type exports', () => {
    const expectedTypes = [
      'PuptNode',
      'PuptElement',
      'ComponentType',
      'RenderContext',
      'RenderError',
      'RenderOptions',
      'RenderResult',
      'EnvironmentContext',
      'PostExecutionAction',
      'LlmProvider',
      'InputRequirement',
      'SearchablePrompt',
      'SearchOptions',
    ];

    for (const name of expectedTypes) {
      it(`should export type "${name}"`, () => {
        const exports = getExportedNames(dtsContent);
        expect(exports.has(name)).toBe(true);
      });
    }
  });

  it('should not have a bare "export { }" that blocks all non-inline exports', () => {
    // A bare `export { }` at the end of a file with non-exported declarations
    // is the signature of the rollupTypes bug. If we see `export { }` and also
    // have declarations without `export`, that's a problem.
    const hasBareExportEmpty = /^export\s*\{\s*\}\s*$/m.test(dtsContent);
    const hasNonExportedDeclarations = /^declare\s+(function|const|class|abstract|type|interface|enum)\s+/m.test(dtsContent);

    if (hasBareExportEmpty && hasNonExportedDeclarations) {
      expect.fail(
        'dist/src/index.d.ts has a bare "export { }" combined with non-exported declarations. ' +
        'This means types are declared but not exported, making them invisible to consumers. ' +
        'See issue #17.',
      );
    }
  });
});

describe('JSX Runtime Type Declaration Exports', () => {
  let dtsContent: string;
  const dtsPath = resolve(__dirname, '../../dist/src/jsx-runtime/index.d.ts');

  beforeAll(() => {
    if (!existsSync(dtsPath)) {
      throw new Error('dist/src/jsx-runtime/index.d.ts not found. Run `npm run build` first.');
    }
    dtsContent = readFileSync(dtsPath, 'utf-8');
  });

  it('should export Fragment', () => {
    expect(dtsContent).toMatch(/export\s+/);
    expect(dtsContent).toContain('Fragment');
  });

  it('should export jsx', () => {
    expect(dtsContent).toContain('jsx');
  });

  it('should export jsxs', () => {
    expect(dtsContent).toContain('jsxs');
  });
});
