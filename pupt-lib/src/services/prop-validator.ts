import type { ZodObject, ZodRawShape, ZodIssue } from 'zod';
import type { RenderError } from '../types/render';

/**
 * Validate component props against a Zod schema.
 * Children are stripped before validation since they are structural, not data.
 *
 * @param componentName - Name of the component (for error reporting)
 * @param props - The full props object (may include children)
 * @param schema - The Zod schema to validate against
 * @returns Array of RenderError objects (empty if valid)
 */
export function validateProps(
  componentName: string,
  props: Record<string, unknown>,
  schema: ZodObject<ZodRawShape>,
): RenderError[] {
  const propsToValidate = Object.fromEntries(
    Object.entries(props).filter(([key]) => key !== 'children'),
  );

  const result = schema.safeParse(propsToValidate);
  if (result.success) {
    return [];
  }

  return result.error.issues.map((issue: ZodIssue) => ({
    component: componentName,
    prop: issue.path.length > 0 ? String(issue.path[0]) : null,
    message: issue.message,
    code: issue.code,
    path: issue.path,
    received: 'received' in issue ? (issue as unknown as Record<string, unknown>).received : undefined,
    expected: 'expected' in issue ? String((issue as unknown as Record<string, unknown>).expected) : undefined,
  }));
}

/**
 * Extract the Zod schema from a component class or function.
 */
export function getSchema(type: unknown): ZodObject<ZodRawShape> | undefined {
  if (
    typeof type === 'function' &&
    'schema' in type &&
    type.schema != null
  ) {
    return type.schema as ZodObject<ZodRawShape>;
  }
  return undefined;
}

/**
 * Extract a human-readable name from a component type.
 */
export function getComponentName(type: unknown): string {
  if (typeof type === 'function' && type.name) {
    return type.name;
  }
  if (typeof type === 'string') {
    return type;
  }
  return 'Unknown';
}
