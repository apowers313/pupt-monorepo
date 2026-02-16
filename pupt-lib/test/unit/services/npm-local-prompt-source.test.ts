import { describe, expect, it, vi } from 'vitest';

import { NpmLocalPromptSource } from '../../../src/services/prompt-sources/npm-local-prompt-source';

describe('NpmLocalPromptSource', () => {
  it('should discover .prompt files in a resolved package prompts/ directory', async () => {
    const source = new NpmLocalPromptSource('test-prompt-package');
    // Mock resolvePackagePath to return our fixture
    vi.spyOn(source, 'resolvePackagePath').mockResolvedValue(
      `${process.cwd()}/test/fixtures/prompt-packages/npm-mock`,
    );

    const prompts = await source.getPrompts();
    expect(prompts.length).toBeGreaterThan(0);
    expect(prompts.every(p => p.filename.endsWith('.prompt'))).toBe(true);
    expect(prompts.map(p => p.filename).sort()).toEqual(['helper.prompt', 'summarizer.prompt']);
  });

  it('should return empty array for packages without prompts/ directory', async () => {
    const source = new NpmLocalPromptSource('vitest');
    const prompts = await source.getPrompts();
    expect(prompts).toEqual([]);
  });

  it('should throw for packages that are not installed', async () => {
    const source = new NpmLocalPromptSource('non-existent-package-xyz-12345');
    await expect(source.getPrompts()).rejects.toThrow();
  });

  it('should include file content in discovered prompts', async () => {
    const source = new NpmLocalPromptSource('test-prompt-package');
    vi.spyOn(source, 'resolvePackagePath').mockResolvedValue(
      `${process.cwd()}/test/fixtures/prompt-packages/npm-mock`,
    );

    const prompts = await source.getPrompts();
    const helper = prompts.find(p => p.filename === 'helper.prompt');
    expect(helper).toBeDefined();
    expect(helper!.content).toContain('<Prompt');
    expect(helper!.content).toContain('name="helper"');
  });

  describe('resolvePackagePath', () => {
    it('should resolve a real installed package', async () => {
      const source = new NpmLocalPromptSource('vitest');
      const packageDir = await source.resolvePackagePath('vitest');
      expect(packageDir).toContain('vitest');
      expect(packageDir).toContain('node_modules');
    });

    it('should throw for non-existent package', async () => {
      const source = new NpmLocalPromptSource('non-existent-package-xyz-12345');
      await expect(
        source.resolvePackagePath('non-existent-package-xyz-12345'),
      ).rejects.toThrow(/Cannot resolve npm package/);
    });
  });
});
