/**
 * Follow a property path on an object to retrieve a nested value.
 *
 * @param obj - The object to traverse
 * @param path - Array of property keys/indices to follow
 * @returns The value at the path, or undefined if not found
 */
export function followPath(obj: unknown, path: (string | number)[]): unknown {
  return path.reduce((current, key) => {
    if (current == null) {return undefined;}
    return (current as Record<string | number, unknown>)[key];
  }, obj);
}
