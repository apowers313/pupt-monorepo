/**
 * Babel plugin that transforms <Uses> JSX elements into import declarations.
 *
 * Transforms:
 * - <Uses component="X" from="source" />        → import { X } from "source"
 * - <Uses component="X" as="Y" from="source" /> → import { X as Y } from "source"
 * - <Uses default="X" from="source" />          → import X from "source"
 * - <Uses component="A, B" from="source" />     → import { A, B } from "source"
 */

import type { PluginObj, types as BabelTypes } from '@babel/core';

interface PluginState {
  file: {
    path: {
      unshiftContainer: (key: string, node: BabelTypes.Statement | BabelTypes.Statement[]) => void;
    };
  };
}

/**
 * Extract a string value from a JSX attribute value.
 */
function getAttributeValue(
  attr: BabelTypes.JSXAttribute,
  t: typeof BabelTypes,
): string | null {
  if (!attr.value) {
    return null;
  }

  // String literal: component="X"
  if (t.isStringLiteral(attr.value)) {
    return attr.value.value;
  }

  // JSX expression container with string: component={"X"}
  if (
    t.isJSXExpressionContainer(attr.value) &&
    t.isStringLiteral(attr.value.expression)
  ) {
    return attr.value.expression.value;
  }

  return null;
}

/**
 * Extract props from a <Uses> JSX element.
 */
function extractUsesProps(
  path: { node: BabelTypes.JSXElement },
  t: typeof BabelTypes,
): { component?: string; defaultImport?: string; as?: string; from?: string } {
  const props: { component?: string; defaultImport?: string; as?: string; from?: string } = {};

  const { attributes } = path.node.openingElement;

  for (const attr of attributes) {
    if (!t.isJSXAttribute(attr)) continue;
    if (!t.isJSXIdentifier(attr.name)) continue;

    const name = attr.name.name;
    const value = getAttributeValue(attr, t);

    if (value === null) continue;

    switch (name) {
      case 'component':
        props.component = value;
        break;
      case 'default':
        props.defaultImport = value;
        break;
      case 'as':
        props.as = value;
        break;
      case 'from':
        props.from = value;
        break;
    }
  }

  return props;
}

/**
 * Create an import declaration from Uses props.
 */
function createImportDeclaration(
  props: { component?: string; defaultImport?: string; as?: string; from: string },
  t: typeof BabelTypes,
): BabelTypes.ImportDeclaration {
  const specifiers: (BabelTypes.ImportSpecifier | BabelTypes.ImportDefaultSpecifier)[] = [];

  if (props.defaultImport) {
    // import X from "source"
    specifiers.push(
      t.importDefaultSpecifier(t.identifier(props.defaultImport)),
    );
  }

  if (props.component) {
    // Handle comma-separated components: "A, B, C"
    const components = props.component.split(',').map(c => c.trim()).filter(Boolean);

    for (const comp of components) {
      if (props.as && components.length === 1) {
        // import { X as Y } from "source"
        specifiers.push(
          t.importSpecifier(t.identifier(props.as), t.identifier(comp)),
        );
      } else {
        // import { X } from "source"
        specifiers.push(
          t.importSpecifier(t.identifier(comp), t.identifier(comp)),
        );
      }
    }
  }

  return t.importDeclaration(specifiers, t.stringLiteral(props.from));
}

/**
 * Babel plugin that transforms <Uses> elements to import declarations.
 */
export function usesToImportPlugin({ types: t }: { types: typeof BabelTypes }): PluginObj<PluginState> {
  return {
    name: 'uses-to-import',
    visitor: {
      JSXElement(path, state) {
        const { openingElement } = path.node;

        // Check if this is a <Uses> element
        if (!t.isJSXIdentifier(openingElement.name)) {
          return;
        }
        if (openingElement.name.name !== 'Uses') {
          return;
        }

        // Extract props
        const props = extractUsesProps(path, t);

        // Validate required props
        if (!props.from) {
          throw path.buildCodeFrameError(
            '<Uses> requires a "from" attribute specifying the module source',
          );
        }

        if (!props.component && !props.defaultImport) {
          throw path.buildCodeFrameError(
            '<Uses> requires either a "component" or "default" attribute',
          );
        }

        // Create import declaration
        const importDecl = createImportDeclaration(
          { ...props, from: props.from },
          t,
        );

        // Add import at the top of the file
        state.file.path.unshiftContainer('body', importDecl);

        // Remove the <Uses> element from JSX
        path.remove();
      },
    },
  };
}
