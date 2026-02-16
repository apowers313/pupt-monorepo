/**
 * Regression test for monorepo package manager detection
 *
 * Issue: When running `pt install` from a subdirectory of a pnpm workspace,
 * the detectPackageManager function was only checking the current directory
 * for lock files, not searching up the directory tree. This caused npm to be
 * used instead of pnpm, which failed with "EUNSUPPORTEDPROTOCOL" error because
 * npm doesn't understand the `workspace:*` protocol used by pnpm workspaces.
 *
 * Status: The detectPackageManager() and isNpmProject() functions were removed
 * from install.ts. Package installation now uses npm directly via the
 * installFromNpm() function. The monorepo lock file traversal functionality
 * is no longer part of the codebase.
 */

import { describe, expect,it } from 'vitest';

import { isNpmPackage, validateGitUrl,validateNpmPackage } from '../../src/commands/install.js';

describe('Monorepo Package Manager Detection - Regression Test', () => {
  describe('install source detection (replacement for removed detectPackageManager)', () => {
    it('should detect valid npm package names', () => {
      expect(isNpmPackage('my-package')).toBe(true);
      expect(isNpmPackage('@org/my-package')).toBe(true);
      expect(isNpmPackage('simple')).toBe(true);
    });

    it('should reject invalid npm package names', () => {
      expect(isNpmPackage('')).toBe(false);
      expect(isNpmPackage('https://github.com/user/repo')).toBe(false);
      expect(isNpmPackage('./local-path')).toBe(false);
      expect(isNpmPackage('/absolute-path')).toBe(false);
    });

    it('should validate npm package names without throwing for valid names', () => {
      expect(() => validateNpmPackage('my-package')).not.toThrow();
      expect(() => validateNpmPackage('@scope/package')).not.toThrow();
    });

    it('should throw for invalid npm package names', () => {
      expect(() => validateNpmPackage('')).toThrow();
      expect(() => validateNpmPackage('https://example.com')).toThrow();
    });

    it('should validate git URLs correctly', () => {
      expect(() => validateGitUrl('https://github.com/user/repo')).not.toThrow();
      expect(() => validateGitUrl('https://github.com/user/repo.git')).not.toThrow();
      expect(() => validateGitUrl('')).toThrow();
      expect(() => validateGitUrl('not-a-url')).toThrow();
    });
  });
});
