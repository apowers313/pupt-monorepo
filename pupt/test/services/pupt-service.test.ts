import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PuptService } from '../../src/services/pupt-service.js';
import { fromDiscoveredPrompt } from '../../src/types/prompt.js';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';

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

  describe('init and discovery', () => {
    it('should discover .prompt files in configured directories', async () => {
      await writePromptFile('test.prompt', `
<Prompt name="test" description="A test prompt" tags={["demo"]}>
  <Task>Hello world</Task>
</Prompt>
      `);

      const service = new PuptService({ promptDirs: [tempDir] });
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

      const service = new PuptService({ promptDirs: [tempDir] });
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

      const service = new PuptService({ promptDirs: [tempDir] });
      await service.init();

      const prompts = service.getPrompts();
      expect(prompts).toHaveLength(2);
      const names = prompts.map(p => p.name).sort();
      expect(names).toEqual(['first', 'second']);
    });

    it('should handle empty directories', async () => {
      const service = new PuptService({ promptDirs: [tempDir] });
      await service.init();

      expect(service.getPrompts()).toHaveLength(0);
    });

    it('should handle non-existent directories', async () => {
      const service = new PuptService({ promptDirs: ['/nonexistent/path'] });
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

      const service = new PuptService({ promptDirs: [tempDir] });
      await service.init();

      expect(service.getPrompts()).toHaveLength(1);
    });

    it('should not re-initialize on second init call', async () => {
      await writePromptFile('test.prompt', `
<Prompt name="test" description="Test">
  <Task>Test</Task>
</Prompt>
      `);

      const service = new PuptService({ promptDirs: [tempDir] });
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

      const service = new PuptService({ promptDirs: [tempDir] });
      await service.init();

      const prompt = service.getPrompt('my-prompt');
      expect(prompt).toBeDefined();
      expect(prompt!.name).toBe('my-prompt');
    });

    it('should return undefined for unknown prompt', async () => {
      const service = new PuptService({ promptDirs: [tempDir] });
      await service.init();

      expect(service.getPrompt('nonexistent')).toBeUndefined();
    });

    it('should find prompt by filename', async () => {
      await writePromptFile('test.prompt', `
<Prompt name="test" description="Test">
  <Task>Test</Task>
</Prompt>
      `);

      const service = new PuptService({ promptDirs: [tempDir] });
      await service.init();

      expect(service.findPrompt('test')).toBeDefined();
      expect(service.findPrompt('test.prompt')).toBeDefined();
    });
  });

  describe('getPromptPath', () => {
    it('should return the file path for a prompt', async () => {
      const filePath = await writePromptFile('test.prompt', `
<Prompt name="test" description="Test">
  <Task>Test</Task>
</Prompt>
      `);

      const service = new PuptService({ promptDirs: [tempDir] });
      await service.init();

      expect(service.getPromptPath('test')).toBe(filePath);
    });
  });

  describe('getPromptsAsAdapted', () => {
    it('should return Prompt objects compatible with search/UI', async () => {
      await writePromptFile('test.prompt', `
<Prompt name="test-prompt" description="A description" tags={["tag1"]}>
  <Task>Content</Task>
</Prompt>
      `);

      const service = new PuptService({ promptDirs: [tempDir] });
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
      expect(p.path).toContain('test.prompt');
      expect(p.filename).toBe('test.prompt');
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

      const service = new PuptService({ promptDirs: [tempDir] });
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

      const service = new PuptService({ promptDirs: [tempDir] });
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

      const service = new PuptService({ promptDirs: [tempDir] });
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

      const service = new PuptService({ promptDirs: [tempDir] });
      await service.init();

      const prompt = service.getPrompt('with-input');
      const result = await prompt!.render({
        inputs: new Map([['greeting', 'Hello']]),
      });
      expect(result.text).toContain('Hello world');
    });

    it('should render with inputs as object', async () => {
      await writePromptFile('with-input.prompt', `
<Prompt name="obj-input" description="With input">
  <Ask.Text name="name" label="Name" />
  <Task>Hi {inputs.name}</Task>
</Prompt>
      `);

      const service = new PuptService({ promptDirs: [tempDir] });
      await service.init();

      const prompt = service.getPrompt('obj-input');
      const result = await prompt!.render({
        inputs: { name: 'Alice' },
      });
      expect(result.text).toContain('Hi Alice');
    });
  });

  describe('prompt with comments', () => {
    it('should handle JSX comments at the top of file', async () => {
      await writePromptFile('commented.prompt', `{/* Converted from test.md */}
<Prompt name="commented" description="With comment">
  <Task>Content here</Task>
</Prompt>
      `);

      const service = new PuptService({ promptDirs: [tempDir] });
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

      const service = new PuptService({ promptDirs: [tempDir] });
      await service.init();

      // Should still discover the valid prompt
      expect(service.getPrompts()).toHaveLength(1);
      expect(service.getPrompts()[0].name).toBe('valid');
    });
  });
});

describe('fromDiscoveredPrompt', () => {
  it('should create a Prompt with correct fields', () => {
    const dp = {
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
