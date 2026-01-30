// Test setup file - runs before all tests

// Import the main entry point which triggers component loading
import '../src/components/index';
import { DEFAULT_ENVIRONMENT, createRuntimeConfig } from '../src/types/context';
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
