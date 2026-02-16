/**
 * Babel plugin that injects custom component destructuring from globalThis.
 *
 * When custom components are provided via createPromptFromSource(), this plugin
 * inserts a variable declaration that extracts them from globalThis:
 *
 *   const { MyComponent, OtherComponent } = globalThis.__PUPT_CUSTOM_COMPONENTS__;
 *
 * The declaration is inserted after the last import declaration in the program.
 * This replaces the previous regex-based approach that found the end of imports
 * via string matching, which could match import-like text in prompt content.
 *
 * Options:
 * - componentNames: string[] — Names of the components to destructure
 * - globalKey: string — The globalThis property key (e.g., '__PUPT_CUSTOM_COMPONENTS__')
 */

import type { PluginObj, types as BabelTypes } from '@babel/core';

interface PluginOptions {
  componentNames: string[];
  globalKey: string;
}

export function customComponentInjectionPlugin(
  { types: t }: { types: typeof BabelTypes },
): PluginObj {
  return {
    name: 'custom-component-injection',
    visitor: {
      Program: {
        exit(path) {
          const {opts} = (this as unknown as { opts: PluginOptions });
          const { componentNames, globalKey } = opts;

          if (!componentNames || componentNames.length === 0) {
            return;
          }

          // Build: const { A, B, C } = globalThis.__PUPT_CUSTOM_COMPONENTS__;
          const declaration = t.variableDeclaration('const', [
            t.variableDeclarator(
              t.objectPattern(
                componentNames.map(name =>
                  t.objectProperty(
                    t.identifier(name),
                    t.identifier(name),
                    false,
                    true, // shorthand
                  ),
                ),
              ),
              t.memberExpression(
                t.identifier('globalThis'),
                t.identifier(globalKey),
              ),
            ),
          ]);

          // Find the last import declaration to insert after it
          const body = path.get('body');
          let lastImportIndex = -1;
          for (let i = 0; i < body.length; i++) {
            if (body[i].isImportDeclaration()) {
              lastImportIndex = i;
            }
          }

          if (lastImportIndex >= 0) {
            body[lastImportIndex].insertAfter(declaration);
          } else {
            // No imports — insert at the beginning
            path.unshiftContainer('body', declaration);
          }
        },
      },
    },
  };
}
