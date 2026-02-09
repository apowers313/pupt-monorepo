import type { PuptNode, PuptElement, ComponentType } from '../types';
import { isPuptElement } from '../types/element';
import { Fragment } from '../jsx-runtime';
import { TYPE, CHILDREN } from '../types/symbols';

/**
 * Check if a PuptElement matches a given type (class reference or string name).
 *
 * @param element - The element to check
 * @param type - A component class/function reference, or a string name
 * @returns true if the element matches the given type
 */
export function isElementOfType(
  element: PuptElement,
  type: ComponentType | string,
): boolean {
  const elementType = element[TYPE];

  if (typeof type === 'string') {
    // Match by name: check class name or function name
    if (typeof elementType === 'function') {
      return elementType.name === type;
    }
    return false;
  }

  // Match by reference
  return elementType === type;
}

/**
 * Find all children that match a given type.
 * Searches through Fragments transparently.
 *
 * @param children - The children to search (PuptNode - can be array, element, string, etc.)
 * @param type - A component class/function reference, or a string name
 * @returns Array of matching PuptElements
 */
export function findChildrenOfType(
  children: PuptNode,
  type: ComponentType | string,
): PuptElement[] {
  const results: PuptElement[] = [];
  collectChildrenOfType(children, type, results);
  return results;
}

function collectChildrenOfType(
  node: PuptNode,
  type: ComponentType | string,
  results: PuptElement[],
): void {
  if (node === null || node === undefined || typeof node === 'boolean') {
    return;
  }

  if (typeof node === 'string' || typeof node === 'number') {
    return;
  }

  if (Array.isArray(node)) {
    for (const child of node) {
      collectChildrenOfType(child, type, results);
    }
    return;
  }

  if (!isPuptElement(node)) {
    return;
  }

  const element = node as PuptElement;

  // If it's a Fragment, search through its children
  if (element[TYPE] === Fragment) {
    const fragmentChildren = element[CHILDREN];
    for (const child of fragmentChildren) {
      collectChildrenOfType(child, type, results);
    }
    return;
  }

  // Check if this element matches
  if (isElementOfType(element, type)) {
    results.push(element);
  }
}

/**
 * Partition children into two groups: those matching the type and the rest.
 * Unlike findChildrenOfType, this does not unwrap Fragments - it operates
 * on the direct children array.
 *
 * @param children - Array of children to partition
 * @param type - A component class/function reference, or a string name
 * @returns Tuple of [matching elements, non-matching nodes]
 */
export function partitionChildren(
  children: PuptNode[],
  type: ComponentType | string,
): [PuptElement[], PuptNode[]] {
  const matching: PuptElement[] = [];
  const rest: PuptNode[] = [];

  for (const child of children) {
    if (isPuptElement(child) && isElementOfType(child as PuptElement, type)) {
      matching.push(child as PuptElement);
    } else {
      rest.push(child);
    }
  }

  return [matching, rest];
}
