import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import { configureModuleResolution } from '../../src/services/module-resolution.js';

describe('Module Resolution', () => {
  let originalNodePath: string | undefined;

  beforeEach(() => {
    originalNodePath = process.env.NODE_PATH;
  });

  afterEach(() => {
    if (originalNodePath === undefined) {
      delete process.env.NODE_PATH;
    } else {
      process.env.NODE_PATH = originalNodePath;
    }
  });

  it('should add packages/node_modules to NODE_PATH', () => {
    delete process.env.NODE_PATH;

    configureModuleResolution('/home/user/.pupt');

    const expectedPath = path.join('/home/user/.pupt', 'packages', 'node_modules');
    expect(process.env.NODE_PATH).toBe(expectedPath);
  });

  it('should not duplicate NODE_PATH entries', () => {
    const packagesPath = path.join('/home/user/.pupt', 'packages', 'node_modules');
    process.env.NODE_PATH = packagesPath;

    configureModuleResolution('/home/user/.pupt');

    // Should not have duplicated the path
    const paths = process.env.NODE_PATH!.split(path.delimiter);
    const count = paths.filter(p => p === packagesPath).length;
    expect(count).toBe(1);
  });

  it('should preserve existing NODE_PATH entries', () => {
    const existingPath = '/some/existing/path';
    process.env.NODE_PATH = existingPath;

    configureModuleResolution('/home/user/.pupt');

    const paths = process.env.NODE_PATH!.split(path.delimiter);
    expect(paths).toContain(existingPath);
    expect(paths).toContain(path.join('/home/user/.pupt', 'packages', 'node_modules'));
  });

  it('should handle empty NODE_PATH', () => {
    process.env.NODE_PATH = '';

    configureModuleResolution('/data/dir');

    const expectedPath = path.join('/data/dir', 'packages', 'node_modules');
    expect(process.env.NODE_PATH).toBe(expectedPath);
  });
});
