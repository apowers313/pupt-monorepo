// Render-related types for pupt-lib

import type { EnvironmentContext } from './context';

/**
 * Options for rendering a prompt
 */
export interface RenderOptions {
  trim?: boolean;
  inputs?: Map<string, unknown> | Record<string, unknown>;
  env?: EnvironmentContext;
  /** When true, warnings (codes matching `warn_*`) are promoted to hard errors, causing `ok: false` */
  throwOnWarnings?: boolean;
  /** Warning codes to suppress entirely (e.g. `['warn_missing_task']`) */
  ignoreWarnings?: string[];
}

/**
 * A validation or runtime error encountered during rendering
 */
export interface RenderError {
  /** Component class name or registry name, e.g. "Section" */
  component: string;
  /** The specific prop that failed validation, or null for cross-field/runtime errors */
  prop: string | null;
  /** Human-readable error message */
  message: string;
  /** Error code (Zod issue code or 'runtime_error' / 'missing_schema') */
  code: string;
  /** Path within the props object */
  path: (string | number)[];
  /** The value that was received */
  received?: unknown;
  /** The expected type or constraint */
  expected?: string;
}

/**
 * Successful render result — no validation errors (may contain non-fatal warnings)
 */
export interface RenderSuccess {
  ok: true;
  text: string;
  /** Non-fatal validation warnings (codes starting with `warn_` or legacy `validation_warning`) */
  errors?: RenderError[];
  postExecution: PostExecutionAction[];
}

/**
 * Failed render result — contains validation errors and best-effort output
 */
export interface RenderFailure {
  ok: false;
  /** Best-effort rendered output (children rendered as fallback for invalid components) */
  text: string;
  errors: RenderError[];
  postExecution: PostExecutionAction[];
}

/**
 * Result of rendering a prompt — discriminated union on `ok`
 */
export type RenderResult = RenderSuccess | RenderFailure;

/**
 * Actions to be executed after the LLM response
 */
export type PostExecutionAction =
  | ReviewFileAction
  | OpenUrlAction
  | RunCommandAction;

/**
 * Action to open a file for review in an editor
 */
export interface ReviewFileAction {
  type: 'reviewFile';
  file: string;
  editor?: string;
}

/**
 * Action to open a URL in a browser
 */
export interface OpenUrlAction {
  type: 'openUrl';
  url: string;
  browser?: string;
}

/**
 * Action to execute a shell command
 */
export interface RunCommandAction {
  type: 'runCommand';
  command: string;
  cwd?: string;
  env?: Record<string, string>;
}

/**
 * Check whether a RenderError code represents a warning rather than a hard error.
 * Warning codes use the `warn_` prefix by convention, with `validation_warning`
 * supported as a legacy alias.
 */
export function isWarningCode(code: string): boolean {
  return code.startsWith('warn_') || code === 'validation_warning';
}
