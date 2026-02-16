import { afterEach,beforeEach, describe, expect, it } from 'vitest';

import { E2eTestEnvironment } from './e2e-env.js';

describe('pt CLI E2E', () => {
  let env: E2eTestEnvironment;

  beforeEach(async () => {
    env = await E2eTestEnvironment.create();
  });

  afterEach(async () => {
    await env.cleanup();
  });

  it('should display help', () => {
    const result = env.exec('--help');

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Usage:');
    expect(result.stdout).toContain('Commands:');
  });

  it('should display version', () => {
    const result = env.exec('--version');

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
  });
});
