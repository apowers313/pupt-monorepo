import { describe, it, expect } from 'vitest';
import { Pupt } from '../../../src/api';
import type { PromptSource } from '../../../src/types/prompt-source';

describe('ModuleLoader error isolation', () => {
  it('should skip failed sources and continue loading others', async () => {
    const failingSource: PromptSource = {
      async getPrompts() { throw new Error('S3 credentials expired'); },
    };
    const workingSource: PromptSource = {
      async getPrompts() {
        return [{ filename: 'test.prompt', content: '<Prompt name="ok"><Task>Works</Task></Prompt>' }];
      },
    };

    const pupt = new Pupt({ modules: [failingSource, workingSource] });
    await pupt.init();

    // Working source should still load despite the failing one
    expect(pupt.getPrompts()).toHaveLength(1);
    expect(pupt.getPrompt('ok')).toBeDefined();
  });

  it('should collect warnings from failed sources', async () => {
    const failingSource: PromptSource = {
      async getPrompts() { throw new Error('Network timeout'); },
    };

    const pupt = new Pupt({ modules: [failingSource] });
    await pupt.init();

    const warnings = pupt.getWarnings();
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('Network timeout');
  });

  it('should not fail entirely when one string module source fails', async () => {
    const pupt = new Pupt({
      modules: [
        'non-existent-package-xyz',
        './test/fixtures/prompt-packages/basic',
      ],
    });
    await pupt.init();
    expect(pupt.getPrompts().length).toBeGreaterThan(0);
  });

  it('should collect multiple warnings from multiple failing sources', async () => {
    const failingSource1: PromptSource = {
      async getPrompts() { throw new Error('First failure'); },
    };
    const failingSource2: PromptSource = {
      async getPrompts() { throw new Error('Second failure'); },
    };
    const workingSource: PromptSource = {
      async getPrompts() {
        return [{ filename: 'ok.prompt', content: '<Prompt name="ok"><Task>Works</Task></Prompt>' }];
      },
    };

    const pupt = new Pupt({ modules: [failingSource1, failingSource2, workingSource] });
    await pupt.init();

    const warnings = pupt.getWarnings();
    expect(warnings).toHaveLength(2);
    expect(warnings[0]).toContain('First failure');
    expect(warnings[1]).toContain('Second failure');
    expect(pupt.getPrompts()).toHaveLength(1);
  });

  it('should return empty warnings when all sources succeed', async () => {
    const workingSource: PromptSource = {
      async getPrompts() {
        return [{ filename: 'test.prompt', content: '<Prompt name="test"><Task>Test</Task></Prompt>' }];
      },
    };

    const pupt = new Pupt({ modules: [workingSource] });
    await pupt.init();

    expect(pupt.getWarnings()).toHaveLength(0);
  });

  it('should have no prompts and a warning when all sources fail', async () => {
    const failingSource: PromptSource = {
      async getPrompts() { throw new Error('Everything failed'); },
    };

    const pupt = new Pupt({ modules: [failingSource] });
    await pupt.init();

    expect(pupt.getPrompts()).toHaveLength(0);
    expect(pupt.getWarnings()).toHaveLength(1);
  });

  it('should include source identifier in warning for string modules', async () => {
    const pupt = new Pupt({
      modules: ['non-existent-package-xyz'],
    });
    await pupt.init();

    const warnings = pupt.getWarnings();
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('non-existent-package-xyz');
  });
});
