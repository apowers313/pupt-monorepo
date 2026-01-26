// Render-related types for pupt-lib

import type { ComponentRegistry } from '../services/component-registry';
import type { EnvironmentContext } from './context';

/**
 * Options for rendering a prompt
 */
export interface RenderOptions {
  format?: 'xml' | 'markdown' | 'json' | 'text';
  trim?: boolean;
  indent?: string;
  maxDepth?: number;
  inputs?: Map<string, unknown> | Record<string, unknown>;
  registry?: ComponentRegistry;
  env?: EnvironmentContext;
}

/**
 * Result of rendering a prompt
 */
export interface RenderResult {
  text: string;
  metadata?: RenderMetadata;
  postExecution: PostExecutionAction[];
}

/**
 * Metadata collected during rendering
 */
export interface RenderMetadata {
  componentCount: number;
  depth: number;
  renderTime: number;
  warnings?: string[];
}

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
