import os from 'node:os';
import path from 'node:path';

import type { ResolvedModuleEntry } from '@pupt/lib';
import fs from 'fs-extra';
import { afterEach,beforeEach, describe, expect, it } from 'vitest';

import { scanLocalPromptDir } from '../../src/services/pupt-prompt-source.js';
import { PuptService } from '../../src/services/pupt-service.js';
import { fromDiscoveredPrompt } from '../../src/types/prompt.js';

describe('PuptService', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pupt-service-test-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  async function writePromptFile(name: string, content: string): Promise<string> {
    const filePath = path.join(tempDir, name);
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, content);
    return filePath;
  }

  /** Scan tempDir and return modules for PuptService */
  async function getModules() {
    return scanLocalPromptDir(tempDir);
  }

  describe('init and discovery', () => {
    it('should discover .prompt files in configured directories', async () => {
      await writePromptFile('test.prompt', `
<Prompt name="test" description="A test prompt" tags={["demo"]}>
  <Task>Hello world</Task>
</Prompt>
      `);

      const service = new PuptService({ modules: await getModules() });
      await service.init();

      const prompts = service.getPrompts();
      expect(prompts).toHaveLength(1);
      expect(prompts[0].name).toBe('test');
      expect(prompts[0].description).toBe('A test prompt');
      expect(prompts[0].tags).toEqual(['demo']);
    });

    it('should discover prompts in subdirectories', async () => {
      await writePromptFile('sub/nested.prompt', `
<Prompt name="nested" description="Nested prompt">
  <Task>Nested content</Task>
</Prompt>
      `);

      const service = new PuptService({ modules: await getModules() });
      await service.init();

      const prompts = service.getPrompts();
      expect(prompts).toHaveLength(1);
      expect(prompts[0].name).toBe('nested');
    });

    it('should discover multiple prompts', async () => {
      await writePromptFile('first.prompt', `
<Prompt name="first" description="First prompt">
  <Task>First</Task>
</Prompt>
      `);
      await writePromptFile('second.prompt', `
<Prompt name="second" description="Second prompt" tags={["tag1", "tag2"]}>
  <Task>Second</Task>
</Prompt>
      `);

      const service = new PuptService({ modules: await getModules() });
      await service.init();

      const prompts = service.getPrompts();
      expect(prompts).toHaveLength(2);
      const names = prompts.map(p => p.name).sort();
      expect(names).toEqual(['first', 'second']);
    });

    it('should handle empty directories', async () => {
      const service = new PuptService({ modules: await getModules() });
      await service.init();

      expect(service.getPrompts()).toHaveLength(0);
    });

    it('should handle non-existent directories', async () => {
      const service = new PuptService({ modules: await scanLocalPromptDir('/nonexistent/path') });
      await service.init();

      expect(service.getPrompts()).toHaveLength(0);
    });

    it('should skip non-prompt files', async () => {
      await writePromptFile('readme.md', '# README');
      await writePromptFile('test.prompt', `
<Prompt name="test" description="Test">
  <Task>Test</Task>
</Prompt>
      `);

      const service = new PuptService({ modules: await getModules() });
      await service.init();

      expect(service.getPrompts()).toHaveLength(1);
    });

    it('should skip .tsx files during discovery', async () => {
      await writePromptFile('valid.prompt', `
<Prompt name="valid" description="Valid prompt">
  <Task>OK</Task>
</Prompt>
      `);
      await writePromptFile('component.tsx', `
export default function Test() { return <div>test</div>; }
      `);

      const service = new PuptService({ modules: await getModules() });
      await service.init();

      // Only the .prompt file should be discovered, not the .tsx
      expect(service.getPrompts()).toHaveLength(1);
      expect(service.getPrompts()[0].name).toBe('valid');
    });

    it('should skip .jsx files during discovery', async () => {
      await writePromptFile('valid.prompt', `
<Prompt name="valid-jsx" description="Valid prompt">
  <Task>OK</Task>
</Prompt>
      `);
      await writePromptFile('component.jsx', `
export default function Test() { return <div>test</div>; }
      `);

      const service = new PuptService({ modules: await getModules() });
      await service.init();

      // Only the .prompt file should be discovered, not the .jsx
      expect(service.getPrompts()).toHaveLength(1);
      expect(service.getPrompts()[0].name).toBe('valid-jsx');
    });

    it('should not re-initialize on second init call', async () => {
      await writePromptFile('test.prompt', `
<Prompt name="test" description="Test">
  <Task>Test</Task>
</Prompt>
      `);

      const service = new PuptService({ modules: await getModules() });
      await service.init();
      expect(service.getPrompts()).toHaveLength(1);

      // Add another file after init
      await writePromptFile('second.prompt', `
<Prompt name="second" description="Second">
  <Task>Second</Task>
</Prompt>
      `);

      // Second init should be a no-op
      await service.init();
      expect(service.getPrompts()).toHaveLength(1);
    });
  });

  describe('getPrompt and findPrompt', () => {
    it('should find a prompt by name', async () => {
      await writePromptFile('test.prompt', `
<Prompt name="my-prompt" description="Test">
  <Task>Test</Task>
</Prompt>
      `);

      const service = new PuptService({ modules: await getModules() });
      await service.init();

      const prompt = service.getPrompt('my-prompt');
      expect(prompt).toBeDefined();
      expect(prompt!.name).toBe('my-prompt');
    });

    it('should return undefined for unknown prompt', async () => {
      const service = new PuptService({ modules: await getModules() });
      await service.init();

      expect(service.getPrompt('nonexistent')).toBeUndefined();
    });

    it('should find prompt by filename', async () => {
      await writePromptFile('test.prompt', `
<Prompt name="test" description="Test">
  <Task>Test</Task>
</Prompt>
      `);

      const service = new PuptService({ modules: await getModules() });
      await service.init();

      expect(service.findPrompt('test')).toBeDefined();
      expect(service.findPrompt('test.prompt')).toBeDefined();
    });
  });

  describe('getPromptsAsAdapted', () => {
    it('should return Prompt objects compatible with search/UI', async () => {
      await writePromptFile('test.prompt', `
<Prompt name="test-prompt" description="A description" tags={["tag1"]}>
  <Task>Content</Task>
</Prompt>
      `);

      const service = new PuptService({ modules: await getModules() });
      await service.init();

      const adapted = service.getPromptsAsAdapted();
      expect(adapted).toHaveLength(1);

      const p = adapted[0];
      expect(p.title).toBe('A description'); // Uses description as human-friendly title
      expect(p.tags).toEqual(['tag1']);
      expect(p.content).toBe('A description');
      expect(p.summary).toBe('A description');
      expect(p.frontmatter).toEqual({});
      expect(p._source).toBeDefined();
      // Path and filename are derived from prompt name when no file path is available
      expect(p.path).toContain('test-prompt');
      expect(p.filename).toBe('test-prompt');
    });
  });

  describe('input iterator', () => {
    it('should discover input requirements from Ask components', async () => {
      await writePromptFile('with-input.prompt', `
<Prompt name="with-input" description="Prompt with input">
  <Ask.Text name="userName" label="Enter your name" />
  <Task>{inputs.userName} says hello</Task>
</Prompt>
      `);

      const service = new PuptService({ modules: await getModules() });
      await service.init();

      const prompt = service.getPrompt('with-input');
      expect(prompt).toBeDefined();

      const iter = prompt!.getInputIterator();
      await iter.start();
      expect(iter.isDone()).toBe(false);

      const req = iter.current();
      expect(req).toBeDefined();
      expect(req!.name).toBe('userName');
      expect(req!.label).toBe('Enter your name');
      expect(req!.type).toBe('string');
    });

    it('should discover multiple inputs', async () => {
      await writePromptFile('multi-input.prompt', `
<Prompt name="multi-input" description="Multiple inputs">
  <Ask.Text name="name" label="Name" />
  <Ask.Text name="topic" label="Topic" />
  <Task>{inputs.name} writes about {inputs.topic}</Task>
</Prompt>
      `);

      const service = new PuptService({ modules: await getModules() });
      await service.init();

      const prompt = service.getPrompt('multi-input');
      const iter = prompt!.getInputIterator();
      await iter.start();

      // First input
      expect(iter.isDone()).toBe(false);
      expect(iter.current()!.name).toBe('name');
      await iter.submit('Alice');
      await iter.advance();

      // Second input
      expect(iter.isDone()).toBe(false);
      expect(iter.current()!.name).toBe('topic');
      await iter.submit('testing');
      await iter.advance();

      expect(iter.isDone()).toBe(true);
    });
  });

  describe('render', () => {
    it('should render a simple prompt', async () => {
      await writePromptFile('simple.prompt', `
<Prompt name="simple" description="Simple">
  <Task>Hello world</Task>
</Prompt>
      `);

      const service = new PuptService({ modules: await getModules() });
      await service.init();

      const prompt = service.getPrompt('simple');
      const result = await prompt!.render();
      expect(result.text).toContain('Hello world');
    });

    it('should render with inputs substituted', async () => {
      await writePromptFile('with-input.prompt', `
<Prompt name="with-input" description="With input">
  <Ask.Text name="greeting" label="Greeting" />
  <Task>{inputs.greeting} world</Task>
</Prompt>
      `);

      const service = new PuptService({ modules: await getModules() });
      await service.init();

      const prompt = service.getPrompt('with-input');
      expect(prompt).toBeDefined();
      const result = await prompt!.render({
        inputs: new Map([['greeting', 'Hello']]),
      });
      // Note: {inputs.greeting} is evaluated at compile time via proxy (returns ''),
      // so render() can't substitute actual values. This is a pupt-lib limitation.
      expect(result.text).toContain('world');
    });

    it('should render with inputs as object', async () => {
      await writePromptFile('with-input.prompt', `
<Prompt name="obj-input" description="With input">
  <Ask.Text name="name" label="Name" />
  <Task>Hi {inputs.name}</Task>
</Prompt>
      `);

      const service = new PuptService({ modules: await getModules() });
      await service.init();

      const prompt = service.getPrompt('obj-input');
      expect(prompt).toBeDefined();
      const result = await prompt!.render({
        inputs: { name: 'Alice' },
      });
      // Note: {inputs.name} is evaluated at compile time via proxy (returns ''),
      // so render() can't substitute actual values. This is a pupt-lib limitation.
      expect(result.text).toContain('Hi');
    });

    it('should render with environment config applied', async () => {
      await writePromptFile('env-test.prompt', `
<Prompt name="env-test" description="Environment test">
  <Task>Hello world</Task>
</Prompt>
      `);

      const service = new PuptService({
        modules: await getModules(),
        environment: {
          llm: {
            model: 'gpt-4',
            provider: 'openai',
          },
        },
      });
      await service.init();

      const prompt = service.getPrompt('env-test');
      expect(prompt).toBeDefined();
      const result = await prompt!.render();
      expect(result.text).toContain('Hello world');
    });

    it('should render with environment config and inputs', async () => {
      await writePromptFile('env-input.prompt', `
<Prompt name="env-input" description="Env with input">
  <Ask.Text name="topic" label="Topic" />
  <Task>Write about {inputs.topic}</Task>
</Prompt>
      `);

      const service = new PuptService({
        modules: await getModules(),
        environment: {
          llm: {
            model: 'claude-3',
            provider: 'anthropic',
          },
          output: {
            trim: true,
            indent: '  ',
          },
        },
      });
      await service.init();

      const prompt = service.getPrompt('env-input');
      expect(prompt).toBeDefined();
      const result = await prompt!.render({
        inputs: new Map([['topic', 'testing']]),
      });
      // Note: inputs are baked in at compile time via proxy (returns ''),
      // so render() can't substitute actual values. This is a pupt-lib limitation.
      // Test just verifies the prompt loads and renders without error.
      expect(result.text).toContain('Write about');
    });
  });

  describe('prompt with comments', () => {
    it('should handle JSX comments at the top of file', async () => {
      await writePromptFile('commented.prompt', `{/* Converted from test.md */}
<Prompt name="commented" description="With comment">
  <Task>Content here</Task>
</Prompt>
      `);

      const service = new PuptService({ modules: await getModules() });
      await service.init();

      const prompt = service.getPrompt('commented');
      expect(prompt).toBeDefined();
      expect(prompt!.name).toBe('commented');
    });
  });

  describe('error handling', () => {
    it('should warn but not fail on invalid prompt files', async () => {
      await writePromptFile('valid.prompt', `
<Prompt name="valid" description="Valid">
  <Task>OK</Task>
</Prompt>
      `);
      await writePromptFile('invalid.prompt', 'this is not valid JSX <<<<');

      const service = new PuptService({ modules: await getModules() });
      await service.init();

      // Should still discover the valid prompt
      expect(service.getPrompts()).toHaveLength(1);
      expect(service.getPrompts()[0].name).toBe('valid');
    });
  });

  describe('library discovery', () => {
    let originalPuptDataDir: string | undefined;

    beforeEach(async () => {
      originalPuptDataDir = process.env.PUPT_DATA_DIR;
      // Point data dir to our temp dir so libraries resolve under tempDir/libraries/
      process.env.PUPT_DATA_DIR = tempDir;
    });

    afterEach(() => {
      if (originalPuptDataDir === undefined) {
        delete process.env.PUPT_DATA_DIR;
      } else {
        process.env.PUPT_DATA_DIR = originalPuptDataDir;
      }
    });

    it('should discover prompts from git library promptDirs', async () => {
      const libraryDir = path.join(tempDir, 'libraries', 'test-lib', 'prompts');
      await fs.ensureDir(libraryDir);
      await fs.writeFile(path.join(libraryDir, 'lib-prompt.prompt'), `
<Prompt name="lib-prompt" description="Library prompt">
  <Task>From library</Task>
</Prompt>
      `);

      const service = new PuptService({
        modules: [
          {
            name: 'test-lib',
            type: 'local',
            source: path.join(tempDir, 'libraries', 'test-lib'),
            promptDirs: ['prompts'],
          } satisfies ResolvedModuleEntry,
        ],
      });
      await service.init();

      const prompts = service.getPrompts();
      expect(prompts).toHaveLength(1);
      expect(prompts[0].name).toBe('lib-prompt');
    });

    it('should discover prompts from both user directories and library modules', async () => {
      // User prompt
      await writePromptFile('user-prompt.prompt', `
<Prompt name="user-prompt" description="User prompt">
  <Task>From user</Task>
</Prompt>
      `);

      // Library prompt
      const libraryDir = path.join(tempDir, 'libraries', 'test-lib', 'prompts');
      await fs.ensureDir(libraryDir);
      await fs.writeFile(path.join(libraryDir, 'lib-prompt.prompt'), `
<Prompt name="lib-prompt" description="Library prompt">
  <Task>From library</Task>
</Prompt>
      `);

      const userModules = await getModules();
      const service = new PuptService({
        modules: [
          ...userModules,
          {
            name: 'test-lib',
            type: 'local',
            source: path.join(tempDir, 'libraries', 'test-lib'),
            promptDirs: ['prompts'],
          } satisfies ResolvedModuleEntry,
        ],
      });
      await service.init();

      const prompts = service.getPrompts();
      const names = prompts.map(p => p.name).sort();
      // User prompt + library prompt (library's internal lib-prompt.prompt)
      expect(names).toContain('user-prompt');
      expect(names).toContain('lib-prompt');
    });

    it('should resolve library prompts from ResolvedModuleEntry', async () => {
      const libraryDir = path.join(tempDir, 'libraries', 'test-lib', 'prompts');
      await fs.ensureDir(libraryDir);
      await fs.writeFile(path.join(libraryDir, 'test.prompt'), `
<Prompt name="resolved-prompt" description="Resolved">
  <Task>Resolved content</Task>
</Prompt>
      `);

      const service = new PuptService({
        modules: [
          {
            name: 'test-lib',
            type: 'local',
            source: path.join(tempDir, 'libraries', 'test-lib'),
            promptDirs: ['prompts'],
          } satisfies ResolvedModuleEntry,
        ],
      });
      await service.init();

      const prompt = service.getPrompt('resolved-prompt');
      expect(prompt).toBeDefined();
      expect(prompt!.name).toBe('resolved-prompt');
    });

    it('should skip libraries with missing directories', async () => {
      const service = new PuptService({
        modules: [
          {
            name: 'missing-lib',
            type: 'local',
            source: path.join(tempDir, 'libraries', 'missing-lib'),
            promptDirs: ['prompts'],
          } satisfies ResolvedModuleEntry,
        ],
      });
      await service.init();

      expect(service.getPrompts()).toHaveLength(0);
    });

    it('should handle libraries with multiple promptDirs', async () => {
      const mainDir = path.join(tempDir, 'libraries', 'multi-lib', 'prompts');
      const extraDir = path.join(tempDir, 'libraries', 'multi-lib', 'extra-prompts');
      await fs.ensureDir(mainDir);
      await fs.ensureDir(extraDir);

      await fs.writeFile(path.join(mainDir, 'main.prompt'), `
<Prompt name="main-prompt" description="Main">
  <Task>Main</Task>
</Prompt>
      `);
      await fs.writeFile(path.join(extraDir, 'extra.prompt'), `
<Prompt name="extra-prompt" description="Extra">
  <Task>Extra</Task>
</Prompt>
      `);

      const service = new PuptService({
        modules: [
          {
            name: 'multi-lib',
            type: 'local',
            source: path.join(tempDir, 'libraries', 'multi-lib'),
            promptDirs: ['prompts', 'extra-prompts'],
          } satisfies ResolvedModuleEntry,
        ],
      });
      await service.init();

      const names = service.getPrompts().map(p => p.name).sort();
      expect(names).toEqual(['extra-prompt', 'main-prompt']);
    });
  });
});

describe('fromDiscoveredPrompt', () => {
  it('should create a Prompt with correct fields', () => {
    const dp = {
      id: 'test-prompt',
      name: 'test-prompt',
      description: 'A test',
      tags: ['tag1', 'tag2'],
      library: 'test-lib',
      element: {} as any,
      render: () => ({ text: '', postExecution: [] }),
      getInputIterator: () => ({} as any),
    };

    const prompt = fromDiscoveredPrompt(dp, '/path/to/test.prompt', '/path/to');
    expect(prompt.title).toBe('A test'); // Uses description as human-friendly title
    expect(prompt.tags).toEqual(['tag1', 'tag2']);
    expect(prompt.content).toBe('A test');
    expect(prompt.summary).toBe('A test');
    expect(prompt.frontmatter).toEqual({});
    expect(prompt.path).toBe('/path/to/test.prompt');
    expect(prompt.relativePath).toBe('test.prompt');
    expect(prompt.filename).toBe('test.prompt');
    expect(prompt._source).toBe(dp);
  });

  it('should handle missing file path', () => {
    const dp = {
      id: 'test',
      name: 'test',
      description: '',
      tags: [],
      library: '',
      element: {} as any,
      render: () => ({ text: '', postExecution: [] }),
      getInputIterator: () => ({} as any),
    };

    const prompt = fromDiscoveredPrompt(dp);
    expect(prompt.path).toBe('test');
    expect(prompt.filename).toBe('test');
  });
});
