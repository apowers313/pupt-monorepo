// Component-related types for pupt-lib

import type { PuptNode } from './element';

/**
 * Base props interface for all components
 */
export interface ComponentProps {
  children?: PuptNode;
}

/**
 * Props for Prompt components (root components)
 */
export interface PromptProps extends ComponentProps {
  name?: string;
  description?: string;
  version?: string;
  tags?: string[];
}

/**
 * Props for structural components
 */
export interface StructuralProps extends ComponentProps {
  name?: string;
}

/**
 * Common props available to all components
 */
export interface CommonProps {
  key?: string | number;
  if?: boolean;
}
