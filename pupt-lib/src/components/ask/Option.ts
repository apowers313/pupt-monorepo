import type { PuptNode } from '../../types';

export interface OptionProps {
  value: string;
  children?: PuptNode;
}

/**
 * Option component for use within Select/MultiSelect.
 * This is a marker component - it doesn't render directly.
 * The parent Select/MultiSelect component processes the options.
 */
export function Option(props: unknown): PuptNode {
  // Options don't render directly - they're collected by parent Select
  // Props are available as OptionProps if needed
  void props;
  return null;
}
