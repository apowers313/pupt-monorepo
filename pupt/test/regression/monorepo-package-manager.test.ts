/**
 * Regression test for monorepo package manager detection
 *
 * Issue: When running `pt install` from a subdirectory of a pnpm workspace,
 * the detectPackageManager function was only checking the current directory
 * for lock files, not searching up the directory tree. This caused npm to be
 * used instead of pnpm, which failed with "EUNSUPPORTEDPROTOCOL" error because
 * npm doesn't understand the `workspace:*` protocol used by pnpm workspaces.
 *
 * Fix: Modified detectPackageManager() to search up the directory tree until
 * it finds a lock file or reaches the filesystem root.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { detectPackageManager } from '../../src/commands/install.js';

vi.mock('fs/promises');

describe('Monorepo Package Manager Detection - Regression Test', () => {
  let originalCwd: string;

  beforeEach(() => {
    vi.clearAllMocks();
    originalCwd = process.cwd();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should detect pnpm when pnpm-lock.yaml is in a parent directory (monorepo)', async () => {
    // Simulate being in /monorepo/packages/app where pnpm-lock.yaml is in /monorepo
    const cwd = process.cwd();
    const parentDir = path.dirname(cwd);
    const grandparentDir = path.dirname(parentDir);

    vi.mocked(fs.access).mockImplementation(async (filePath) => {
      const file = String(filePath);

      // pnpm-lock.yaml exists in grandparent (simulating monorepo root)
      if (file === path.join(grandparentDir, 'pnpm-lock.yaml')) {
        return undefined;
      }

      throw new Error('ENOENT');
    });

    const result = await detectPackageManager();
    expect(result).toBe('pnpm');
  });

  it('should detect yarn when yarn.lock is in a parent directory (monorepo)', async () => {
    const cwd = process.cwd();
    const parentDir = path.dirname(cwd);

    vi.mocked(fs.access).mockImplementation(async (filePath) => {
      const file = String(filePath);

      // yarn.lock exists in parent directory
      if (file === path.join(parentDir, 'yarn.lock')) {
        return undefined;
      }

      throw new Error('ENOENT');
    });

    const result = await detectPackageManager();
    expect(result).toBe('yarn');
  });

  it('should prefer pnpm over yarn when both exist at different levels', async () => {
    const cwd = process.cwd();
    const parentDir = path.dirname(cwd);
    const grandparentDir = path.dirname(parentDir);

    vi.mocked(fs.access).mockImplementation(async (filePath) => {
      const file = String(filePath);

      // pnpm-lock.yaml in current dir, yarn.lock in parent
      if (file === path.join(cwd, 'pnpm-lock.yaml')) {
        return undefined;
      }
      if (file === path.join(parentDir, 'yarn.lock')) {
        return undefined;
      }

      throw new Error('ENOENT');
    });

    const result = await detectPackageManager();
    // pnpm should be detected first because we check it before yarn in the same directory
    expect(result).toBe('pnpm');
  });

  it('should detect package-lock.json in parent directory for npm monorepos', async () => {
    const cwd = process.cwd();
    const parentDir = path.dirname(cwd);

    vi.mocked(fs.access).mockImplementation(async (filePath) => {
      const file = String(filePath);

      // package-lock.json exists in parent directory (npm workspaces)
      if (file === path.join(parentDir, 'package-lock.json')) {
        return undefined;
      }

      throw new Error('ENOENT');
    });

    const result = await detectPackageManager();
    expect(result).toBe('npm');
  });

  it('should default to npm when no lock file exists in any parent', async () => {
    // All access calls fail
    vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));

    const result = await detectPackageManager();
    expect(result).toBe('npm');
  });
});
