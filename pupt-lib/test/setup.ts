// Test setup file - runs before all tests
// This ensures the default registry is populated with built-in components

// Import the main entry point which triggers component registration
import '../src/components/index';
import { DEFAULT_ENVIRONMENT, createRuntimeConfig } from '../src/types/context';
import { defaultRegistry } from '../src/services/component-registry';
import type { RenderContext } from '../src/types/context';

/**
 * Create a render context for testing.
 * @param overrides - Optional overrides for the context
 */
export function createRenderContext(overrides?: Partial<RenderContext>): RenderContext {
  return {
    inputs: new Map(),
    env: { ...DEFAULT_ENVIRONMENT, runtime: createRuntimeConfig() },
    scope: null,
    registry: defaultRegistry,
    postExecution: [],
    ...overrides,
  };
}
