// Test setup file - runs before all tests

// Debug timing for CI
const DEBUG_TIMING = process.env.CI === 'true';
const setupStart = Date.now();
function logTiming(label: string) {
  if (DEBUG_TIMING) {
    console.log(`[TIMING] ${label}: ${Date.now() - setupStart}ms`);
  }
}
logTiming('Setup file started');

// Import the main entry point which triggers component loading
import '../src/components/index';
logTiming('After components import');

import { DEFAULT_ENVIRONMENT, createRuntimeConfig } from '../src/types/context';
logTiming('After context import');

import type { RenderContext } from '../src/types/context';

/**
 * Create a render context for testing.
 * @param overrides - Optional overrides for the context
 */
export function createRenderContext(overrides?: Partial<RenderContext>): RenderContext {
  return {
    inputs: new Map(),
    env: { ...DEFAULT_ENVIRONMENT, runtime: createRuntimeConfig() },
    postExecution: [],
    errors: [],
    ...overrides,
  };
}
