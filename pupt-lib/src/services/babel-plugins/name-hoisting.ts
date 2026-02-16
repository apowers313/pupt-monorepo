/**
 * Babel plugin that hoists named JSX elements into variable declarations.
 *
 * Transforms:
 * - <Ask.Text name="username" />  → const username = <Ask.Text name="username" />
 *
 * This enables natural variable syntax for component communication:
 * - <Task>Greet {username}</Task> now works because username is a variable
 *
 * The plugin runs BEFORE the JSX transform, so it works with raw JSX elements.
 */

import type { NodePath,PluginObj, types as BabelTypes } from '@babel/core';

import { getStructuralComponents } from '../component-discovery';

// JavaScript reserved words that cannot be used as variable names
const RESERVED_WORDS = new Set([
  'break', 'case', 'catch', 'continue', 'debugger', 'default', 'delete',
  'do', 'else', 'finally', 'for', 'function', 'if', 'in', 'instanceof',
  'new', 'return', 'switch', 'this', 'throw', 'try', 'typeof', 'var',
  'void', 'while', 'with', 'class', 'const', 'enum', 'export', 'extends',
  'import', 'super', 'implements', 'interface', 'let', 'package', 'private',
  'protected', 'public', 'static', 'yield', 'true', 'false', 'null',
]);

/**
 * Check if a string is a valid JavaScript identifier
 */
function isValidIdentifier(name: string): boolean {
  // Must start with letter, underscore, or $
  if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)) {
    return false;
  }

  // Cannot be a reserved word
  if (RESERVED_WORDS.has(name)) {
    return false;
  }

  return true;
}

/**
 * Extract the string value from a JSX attribute value node.
 * Handles both string literals and JSX expression containers with string literals.
 */
function getNameValue(
  value: BabelTypes.JSXAttribute['value'],
  t: typeof BabelTypes,
): string | null {
  if (!value) {
    return null;
  }

  // String literal: name="username"
  if (t.isStringLiteral(value)) {
    return value.value;
  }

  // JSX expression container: name={"username"}
  if (t.isJSXExpressionContainer(value) && t.isStringLiteral(value.expression)) {
    return value.expression.value;
  }

  return null;
}

/**
 * Find the 'name' attribute in a JSX element's attributes.
 */
function findNameAttribute(
  attributes: (BabelTypes.JSXAttribute | BabelTypes.JSXSpreadAttribute)[],
  t: typeof BabelTypes,
): { attr: BabelTypes.JSXAttribute; value: string } | null {
  for (const attr of attributes) {
    if (!t.isJSXAttribute(attr)) {continue;}
    if (!t.isJSXIdentifier(attr.name)) {continue;}
    if (attr.name.name !== 'name') {continue;}

    const value = getNameValue(attr.value, t);
    if (value) {
      return { attr, value };
    }
  }

  return null;
}

/**
 * Built-in structural components that use `name` for identification, not variable creation.
 * These should NOT be hoisted even though they have a `name` prop.
 * Computed lazily from actual component exports.
 */
let _structuralSet: Set<string> | null = null;
function getStructuralSet(): Set<string> {
  if (!_structuralSet) {
    _structuralSet = new Set(getStructuralComponents());
  }
  return _structuralSet;
}

/**
 * Check if the JSX element should have its name hoisted to a variable.
 *
 * Hoisting is enabled for:
 * - Ask components (Ask.*, AskText, Text, Number, etc.)
 * - Custom components (any PascalCase identifier like GitHubUserInfo, MockUserInfo)
 *
 * Hoisting is disabled for:
 * - Built-in structural components (Prompt, Section, Task, etc.)
 *
 * This allows patterns like:
 *   <GitHubUserInfo username="octocat" name="github" />
 *   <Task>Stars: {github.stars}</Task>
 */
function shouldHoistName(
  elementName: BabelTypes.JSXOpeningElement['name'],
  t: typeof BabelTypes,
): boolean {
  // Member expressions (X.Y) → always hoist
  if (t.isJSXMemberExpression(elementName)) {
    return true;
  }

  if (t.isJSXIdentifier(elementName)) {
    const {name} = elementName;

    // Built-in structural components should NOT be hoisted
    // These use `name` for identification, not variable creation
    if (getStructuralSet().has(name)) {
      return false;
    }

    // Any PascalCase identifier → hoist (covers Ask*, shorthands, custom components)
    if (name.length > 0 && name[0] === name[0].toUpperCase() && name[0] !== name[0].toLowerCase()) {
      return true;
    }

    return false;
  }

  return false;
}

/**
 * WeakMap to track hoisted names per Program node.
 * This ensures each file/program has its own namespace and prevents
 * duplicate variable declarations when the same name is used multiple times.
 */
const hoistedNamesPerProgram = new WeakMap<BabelTypes.Program, Set<string>>();

/**
 * Get or create the set of hoisted names for a program.
 */
function getHoistedNames(programNode: BabelTypes.Program): Set<string> {
  let names = hoistedNamesPerProgram.get(programNode);
  if (!names) {
    names = new Set<string>();
    hoistedNamesPerProgram.set(programNode, names);
  }
  return names;
}

/**
 * Babel plugin that hoists named JSX elements to variable declarations.
 */
export function nameHoistingPlugin({ types: t }: { types: typeof BabelTypes }): PluginObj {
  return {
    name: 'pupt-name-hoisting',
    visitor: {
      // Use exit traversal to process children before parents
      // This ensures child elements are hoisted before their parent gets hoisted
      JSXElement: {
        exit(path: NodePath<BabelTypes.JSXElement>) {
          const { openingElement } = path.node;

          // Only hoist components that should have their names become variables
          if (!shouldHoistName(openingElement.name, t)) {
            return;
          }

          // Find the name attribute
          const nameInfo = findNameAttribute(openingElement.attributes, t);
          if (!nameInfo) {
            return;
          }

          // Skip if we're already inside a variable declaration with this element
          // (prevents infinite loop when we create: const x = <JSX name="x" />)
          const parentDeclarator = path.findParent(p => p.isVariableDeclarator());
          if (parentDeclarator) {
            return;
          }

          const varName = nameInfo.value;

          // Validate that the name is a valid identifier
          if (!isValidIdentifier(varName)) {
            throw path.buildCodeFrameError(
              `Invalid variable name: "${varName}". Must be a valid JavaScript identifier and not a reserved word.`,
            );
          }

          // Find the program node to track hoisted names per-file
          const programPath = path.findParent(p => p.isProgram());
          if (!programPath) {
            return;
          }
          const programNode = programPath.node as BabelTypes.Program;
          const hoistedNames = getHoistedNames(programNode);

          // Check if this name has already been hoisted
          const alreadyHoisted = hoistedNames.has(varName);

          // If already hoisted, just replace with variable reference (no new declaration)
          if (alreadyHoisted) {
            if (path.parentPath.isJSXElement() || path.parentPath.isJSXFragment()) {
              // Inside JSX: wrap in expression container
              path.replaceWith(t.jsxExpressionContainer(t.identifier(varName)));
            } else if (path.parentPath.isExpressionStatement()) {
              // Standalone expression: remove it entirely (already declared)
              path.parentPath.remove();
            } else {
              // Other contexts: just use the identifier
              path.replaceWith(t.identifier(varName));
            }
            return;
          }

          // Mark this name as hoisted
          hoistedNames.add(varName);

          // Find the statement-level parent
          const statementParent = path.findParent(
            p => p.isStatement() || p.isProgram(),
          );

          if (!statementParent) {
            return;
          }

          // Create variable declaration: const varName = <OriginalJSX />
          const varDeclaration = t.variableDeclaration('const', [
            t.variableDeclarator(
              t.identifier(varName),
              path.node,
            ),
          ]);

          // Handle different contexts
          if (path.parentPath.isExpressionStatement()) {
          // If the JSX is a standalone expression statement, replace with variable declaration
            path.parentPath.replaceWith(varDeclaration);
          } else if (path.parentPath.isJSXElement() || path.parentPath.isJSXFragment()) {
          // If JSX is a child of another JSX element/fragment:
          // 1. Insert variable declaration before the parent statement
          // 2. Replace this JSX with the variable reference
            const parentStatement = path.findParent(p => p.isStatement());
            if (parentStatement) {
              parentStatement.insertBefore(varDeclaration);
            }
            path.replaceWith(t.jsxExpressionContainer(t.identifier(varName)));
          } else {
          // For other cases (e.g., in function arguments, array elements):
          // Insert declaration before the statement and replace with reference
            statementParent.insertBefore(varDeclaration);
            path.replaceWith(t.identifier(varName));
          }
        },
      },
    },
  };
}
