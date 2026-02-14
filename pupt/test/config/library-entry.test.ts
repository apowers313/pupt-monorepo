import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { ConfigSchema } from '../../src/schemas/config-schema.js';

// Extract the libraries schema from ConfigSchema for direct testing
const librariesSchema = ConfigSchema.shape.libraries;

describe('LibraryEntry', () => {
  describe('GitLibraryEntry validation', () => {
    it('should validate a valid GitLibraryEntry', () => {
      const entry = {
        name: 'my-prompts',
        type: 'git' as const,
        source: 'https://github.com/user/my-prompts.git',
        promptDirs: ['prompts'],
        installedAt: '2024-01-15T10:30:00.000Z',
        version: 'abc1234',
      };

      const result = librariesSchema.safeParse([entry]);
      expect(result.success).toBe(true);
    });

    it('should validate entry without optional version', () => {
      const entry = {
        name: 'my-prompts',
        type: 'git' as const,
        source: 'https://github.com/user/my-prompts.git',
        promptDirs: ['prompts'],
        installedAt: '2024-01-15T10:30:00.000Z',
      };

      const result = librariesSchema.safeParse([entry]);
      expect(result.success).toBe(true);
    });

    it('should reject entry with missing required fields', () => {
      const entries = [
        // Missing name
        { type: 'git', source: 'https://github.com/user/repo', promptDirs: ['prompts'], installedAt: '2024-01-15' },
        // Missing type
        { name: 'test', source: 'https://github.com/user/repo', promptDirs: ['prompts'], installedAt: '2024-01-15' },
        // Missing source
        { name: 'test', type: 'git', promptDirs: ['prompts'], installedAt: '2024-01-15' },
        // Missing promptDirs
        { name: 'test', type: 'git', source: 'https://github.com/user/repo', installedAt: '2024-01-15' },
        // Missing installedAt
        { name: 'test', type: 'git', source: 'https://github.com/user/repo', promptDirs: ['prompts'] },
      ];

      for (const entry of entries) {
        const result = librariesSchema.safeParse([entry]);
        expect(result.success).toBe(false);
      }
    });

    it('should validate promptDirs as array of strings', () => {
      const validEntry = {
        name: 'test',
        type: 'git' as const,
        source: 'https://github.com/user/repo',
        promptDirs: ['prompts', 'extra-prompts', 'src/prompts'],
        installedAt: '2024-01-15T10:30:00.000Z',
      };

      const result = librariesSchema.safeParse([validEntry]);
      expect(result.success).toBe(true);
    });

    it('should reject invalid promptDirs types', () => {
      const invalidEntry = {
        name: 'test',
        type: 'git' as const,
        source: 'https://github.com/user/repo',
        promptDirs: [123, true], // not strings
        installedAt: '2024-01-15T10:30:00.000Z',
      };

      const result = librariesSchema.safeParse([invalidEntry]);
      expect(result.success).toBe(false);
    });

    it('should reject invalid type values', () => {
      const entry = {
        name: 'test',
        type: 'pypi', // unsupported type
        source: 'some-package',
        promptDirs: ['prompts'],
        installedAt: '2024-01-15T10:30:00.000Z',
      };

      const result = librariesSchema.safeParse([entry]);
      expect(result.success).toBe(false);
    });

    it('should reject npm entry missing required version field', () => {
      const entry = {
        name: 'test',
        type: 'npm',
        source: 'some-package',
        promptDirs: ['prompts'],
        installedAt: '2024-01-15T10:30:00.000Z',
        // missing required 'version' field
      };

      const result = librariesSchema.safeParse([entry]);
      expect(result.success).toBe(false);
    });

    it('should validate empty libraries array', () => {
      const result = librariesSchema.safeParse([]);
      expect(result.success).toBe(true);
    });

    it('should validate multiple library entries', () => {
      const entries = [
        {
          name: 'lib-a',
          type: 'git' as const,
          source: 'https://github.com/user/lib-a',
          promptDirs: ['prompts'],
          installedAt: '2024-01-15T10:30:00.000Z',
        },
        {
          name: 'lib-b',
          type: 'git' as const,
          source: 'https://github.com/user/lib-b',
          promptDirs: ['src/prompts', 'lib/prompts'],
          installedAt: '2024-02-01T12:00:00.000Z',
          version: 'def5678',
        },
      ];

      const result = librariesSchema.safeParse(entries);
      expect(result.success).toBe(true);
    });
  });

  describe('NpmLibraryEntry validation', () => {
    it('should validate a valid NpmLibraryEntry', () => {
      const entry = {
        name: '@acme/prompts',
        type: 'npm' as const,
        source: '@acme/prompts',
        promptDirs: ['prompts'],
        installedAt: '2024-01-15T10:30:00.000Z',
        version: '1.2.3',
      };

      const result = librariesSchema.safeParse([entry]);
      expect(result.success).toBe(true);
    });

    it('should validate npm entry with multiple promptDirs', () => {
      const entry = {
        name: 'my-prompts',
        type: 'npm' as const,
        source: 'my-prompts',
        promptDirs: ['prompts', 'extra-prompts'],
        installedAt: '2024-01-15T10:30:00.000Z',
        version: '2.0.0',
      };

      const result = librariesSchema.safeParse([entry]);
      expect(result.success).toBe(true);
    });

    it('should validate mixed git and npm entries', () => {
      const entries = [
        {
          name: 'git-lib',
          type: 'git' as const,
          source: 'https://github.com/user/git-lib',
          promptDirs: ['prompts'],
          installedAt: '2024-01-15T10:30:00.000Z',
        },
        {
          name: '@acme/npm-lib',
          type: 'npm' as const,
          source: '@acme/npm-lib',
          promptDirs: ['prompts'],
          installedAt: '2024-02-01T12:00:00.000Z',
          version: '1.0.0',
        },
      ];

      const result = librariesSchema.safeParse(entries);
      expect(result.success).toBe(true);
    });
  });

  describe('Config with libraries', () => {
    it('should validate a full config with libraries', () => {
      const config = {
        promptDirs: ['/home/user/prompts'],
        libraries: [
          {
            name: 'my-lib',
            type: 'git' as const,
            source: 'https://github.com/user/my-lib.git',
            promptDirs: ['prompts'],
            installedAt: '2024-01-15T10:30:00.000Z',
          },
        ],
        version: '8.0.0',
      };

      const result = ConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should validate config with empty libraries', () => {
      const config = {
        promptDirs: ['/home/user/prompts'],
        libraries: [],
        version: '8.0.0',
      };

      const result = ConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });
  });
});
