// Test setup file - runs before all tests

// Debug timing for CI - only log slow operations (>1s)
const DEBUG_TIMING = process.env.CI === 'true';
const SLOW_THRESHOLD_MS = 1000;
const setupStart = Date.now();
let lastCheckpoint = setupStart;

function logSlowStep(step: string) {
  if (!DEBUG_TIMING) return;
  const now = Date.now();
  const stepTime = now - lastCheckpoint;
  if (stepTime >= SLOW_THRESHOLD_MS) {
    console.log(`[SLOW SETUP] ${step} took ${stepTime}ms`);
  }
  lastCheckpoint = now;
}

// Import the main entry point which triggers component loading
import '../src/components/index';
logSlowStep('components import');

import { DEFAULT_ENVIRONMENT, createRuntimeConfig } from '../src/types/context';
logSlowStep('context import');

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
