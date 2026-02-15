import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModuleLoader } from '../../../src/services/module-loader';
import { isResolvedModuleEntry } from '../../../src/types/module';
import type { ResolvedModuleEntry } from '../../../src/types/module';
import type { PromptSource } from '../../../src/types/prompt-source';

describe('ResolvedModuleEntry', () => {
  describe('isResolvedModuleEntry type guard', () => {
    it('should return true for valid ResolvedModuleEntry', () => {
      expect(isResolvedModuleEntry({
        name: 'my-lib',
        type: 'npm',
        source: 'my-lib',
      })).toBe(true);
    });

    it('should return true for all valid types', () => {
      for (const type of ['git', 'npm', 'local', 'url'] as const) {
        expect(isResolvedModuleEntry({
          name: 'test',
          type,
          source: 'test-source',
        })).toBe(true);
      }
    });

    it('should return true with optional fields', () => {
      expect(isResolvedModuleEntry({
        name: 'my-lib',
        type: 'git',
        source: 'https://github.com/user/repo',
        promptDirs: ['prompts', 'advanced'],
        version: 'abc12345',
      })).toBe(true);
    });

    it('should return false for plain strings', () => {
      expect(isResolvedModuleEntry('my-lib')).toBe(false);
    });

    it('should return false for null', () => {
      expect(isResolvedModuleEntry(null)).toBe(false);
    });

    it('should return false for PromptSource objects', () => {
      const source: PromptSource = {
        async getPrompts() { return []; },
      };
      expect(isResolvedModuleEntry(source)).toBe(false);
    });

    it('should return false for package references', () => {
      expect(isResolvedModuleEntry({
        source: 'my-source',
        config: { key: 'value' },
      })).toBe(false);
    });

    it('should return false for invalid type values', () => {
      expect(isResolvedModuleEntry({
        name: 'test',
        type: 'invalid',
        source: 'test',
      })).toBe(false);
    });

    it('should return false for missing required fields', () => {
      expect(isResolvedModuleEntry({ name: 'test', type: 'npm' })).toBe(false);
      expect(isResolvedModuleEntry({ name: 'test', source: 'test' })).toBe(false);
      expect(isResolvedModuleEntry({ type: 'npm', source: 'test' })).toBe(false);
    });
  });

  describe('ModuleLoader.loadEntry with ResolvedModuleEntry', () => {
    let loader: ModuleLoader;

    beforeEach(() => {
      loader = new ModuleLoader();
    });

    it('should route npm type to loadNpm', async () => {
      const loadNpmSpy = vi.spyOn(loader as never, 'loadNpm');
      loadNpmSpy.mockResolvedValue({
        name: 'auto-detected',
        components: {},
        prompts: {},
        dependencies: [],
      });

      const entry: ResolvedModuleEntry = {
        name: 'my-npm-lib',
        type: 'npm',
        source: 'my-npm-lib',
      };

      const library = await loader.loadEntry(entry);

      expect(loadNpmSpy).toHaveBeenCalledWith('my-npm-lib', undefined);
      // Name should be overridden by the entry's explicit name
      expect(library.name).toBe('my-npm-lib');
    });

    it('should route local type to loadLocal', async () => {
      const loadLocalSpy = vi.spyOn(loader as never, 'loadLocal');
      loadLocalSpy.mockResolvedValue({
        name: 'auto-detected',
        components: {},
        prompts: {},
        dependencies: [],
      });

      const entry: ResolvedModuleEntry = {
        name: 'local-lib',
        type: 'local',
        source: './my-local-lib',
      };

      const library = await loader.loadEntry(entry);

      expect(loadLocalSpy).toHaveBeenCalledWith('./my-local-lib', undefined);
      expect(library.name).toBe('local-lib');
    });

    it('should route url type to loadUrl', async () => {
      const loadUrlSpy = vi.spyOn(loader as never, 'loadUrl');
      loadUrlSpy.mockResolvedValue({
        name: 'auto-detected',
        components: {},
        prompts: {},
        dependencies: [],
      });

      const entry: ResolvedModuleEntry = {
        name: 'url-lib',
        type: 'url',
        source: 'https://cdn.example.com/lib.js',
      };

      const library = await loader.loadEntry(entry);

      expect(loadUrlSpy).toHaveBeenCalledWith('https://cdn.example.com/lib.js');
      expect(library.name).toBe('url-lib');
    });

    it('should route git type to loadGit', async () => {
      const loadGitSpy = vi.spyOn(loader as never, 'loadGit');
      loadGitSpy.mockResolvedValue({
        name: 'auto-detected',
        components: {},
        prompts: {},
        dependencies: [],
      });

      const entry: ResolvedModuleEntry = {
        name: 'git-lib',
        type: 'git',
        source: 'https://github.com/user/repo',
      };

      const library = await loader.loadEntry(entry);

      expect(loadGitSpy).toHaveBeenCalledWith('https://github.com/user/repo', undefined);
      expect(library.name).toBe('git-lib');
    });

    it('should pass promptDirs to loadLocal', async () => {
      const loadLocalSpy = vi.spyOn(loader as never, 'loadLocal');
      loadLocalSpy.mockResolvedValue({
        name: 'auto-detected',
        components: {},
        prompts: {},
        dependencies: [],
      });

      const entry: ResolvedModuleEntry = {
        name: 'multi-dir-lib',
        type: 'local',
        source: './my-lib',
        promptDirs: ['prompts', 'advanced', 'templates'],
      };

      await loader.loadEntry(entry);

      expect(loadLocalSpy).toHaveBeenCalledWith('./my-lib', ['prompts', 'advanced', 'templates']);
    });

    it('should pass promptDirs to loadNpm', async () => {
      const loadNpmSpy = vi.spyOn(loader as never, 'loadNpm');
      loadNpmSpy.mockResolvedValue({
        name: 'auto-detected',
        components: {},
        prompts: {},
        dependencies: [],
      });

      const entry: ResolvedModuleEntry = {
        name: 'npm-multi-dir',
        type: 'npm',
        source: 'npm-multi-dir',
        promptDirs: ['prompts', 'extras'],
      };

      await loader.loadEntry(entry);

      expect(loadNpmSpy).toHaveBeenCalledWith('npm-multi-dir', ['prompts', 'extras']);
    });

    it('should pass promptDirs to loadGit', async () => {
      const loadGitSpy = vi.spyOn(loader as never, 'loadGit');
      loadGitSpy.mockResolvedValue({
        name: 'auto-detected',
        components: {},
        prompts: {},
        dependencies: [],
      });

      const entry: ResolvedModuleEntry = {
        name: 'github-multi-dir',
        type: 'git',
        source: 'https://github.com/user/repo',
        promptDirs: ['prompts', 'templates'],
      };

      await loader.loadEntry(entry);

      expect(loadGitSpy).toHaveBeenCalledWith(
        'https://github.com/user/repo',
        ['prompts', 'templates'],
      );
    });

    it('should override auto-detected name with entry name', async () => {
      const loadNpmSpy = vi.spyOn(loader as never, 'loadNpm');
      loadNpmSpy.mockResolvedValue({
        name: 'auto-detected-name',
        components: {},
        prompts: {},
        dependencies: [],
      });

      const entry: ResolvedModuleEntry = {
        name: 'my-custom-name',
        type: 'npm',
        source: 'some-package',
      };

      const library = await loader.loadEntry(entry);
      expect(library.name).toBe('my-custom-name');
    });

    it('should deduplicate by source', async () => {
      const loadNpmSpy = vi.spyOn(loader as never, 'loadNpm');
      loadNpmSpy.mockResolvedValue({
        name: 'auto',
        components: {},
        prompts: {},
        dependencies: [],
      });

      const entry: ResolvedModuleEntry = {
        name: 'my-lib',
        type: 'npm',
        source: 'my-lib',
      };

      await loader.loadEntry(entry);
      await loader.loadEntry(entry);

      // Should only load once
      expect(loadNpmSpy).toHaveBeenCalledTimes(1);
    });

    it('should detect version conflicts', async () => {
      const loadNpmSpy = vi.spyOn(loader as never, 'loadNpm');
      loadNpmSpy.mockResolvedValue({
        name: 'auto',
        components: {},
        prompts: {},
        dependencies: [],
      });

      const entry1: ResolvedModuleEntry = {
        name: 'my-lib',
        type: 'npm',
        source: 'my-lib',
        version: '1.0.0',
      };

      await loader.loadEntry(entry1);

      const entry2: ResolvedModuleEntry = {
        name: 'my-lib',
        type: 'npm',
        source: 'my-lib-other',
        version: '2.0.0',
      };

      await expect(loader.loadEntry(entry2)).rejects.toThrow('Version conflict');
    });
  });

  describe('LocalPromptSource with promptDirs', () => {
    it('should discover prompts from multiple directories', async () => {
      const loader = new ModuleLoader();

      const entry: ResolvedModuleEntry = {
        name: 'multi-dir',
        type: 'local',
        source: './test/fixtures/prompt-packages/multi-dirs',
        promptDirs: ['prompts', 'advanced'],
      };

      const library = await loader.loadEntry(entry);

      expect(library.name).toBe('multi-dir');
      expect(library.prompts['basic']).toBeDefined();
      expect(library.prompts['basic'].name).toBe('basic');
      expect(library.prompts['expert']).toBeDefined();
      expect(library.prompts['expert'].name).toBe('expert');
    });

    it('should use default discovery when promptDirs is not provided', async () => {
      const loader = new ModuleLoader();

      const entry: ResolvedModuleEntry = {
        name: 'basic-lib',
        type: 'local',
        source: './test/fixtures/prompt-packages/basic',
      };

      const library = await loader.loadEntry(entry);

      expect(library.name).toBe('basic-lib');
      expect(Object.keys(library.prompts).length).toBeGreaterThan(0);
    });

    it('should skip non-existent promptDirs without error', async () => {
      const loader = new ModuleLoader();

      const entry: ResolvedModuleEntry = {
        name: 'partial-dirs',
        type: 'local',
        source: './test/fixtures/prompt-packages/multi-dirs',
        promptDirs: ['prompts', 'nonexistent-dir'],
      };

      const library = await loader.loadEntry(entry);

      // Should still find prompts from the existing 'prompts' directory
      expect(library.prompts['basic']).toBeDefined();
    });
  });
});
