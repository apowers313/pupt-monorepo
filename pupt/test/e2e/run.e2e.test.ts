import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { E2eTestEnvironment } from './e2e-env.js';

describe('pt run E2E', () => {
  let env: E2eTestEnvironment;

  beforeEach(async () => {
    env = await E2eTestEnvironment.create();
  });

  afterEach(async () => {
    await env.cleanup();
  });

  describe('basic run with cat', () => {
    it('should run with cat tool and a named prompt', async () => {
      await env.writeConfig({
        promptDirs: ['./.prompts'],
        version: '8.0.0',
      });

      // Write a pupt-lib JSX prompt (.prompt file)
      await env.writePrompt('.prompts', 'simple.prompt', `<Prompt name="simple">
  Hello World
</Prompt>`);

      const result = env.exec('run cat -p simple --no-interactive');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Hello World');
    });

    it('should render prompts correctly', async () => {
      await env.writeConfig({
        promptDirs: ['./.prompts'],
        version: '8.0.0',
      });

      await env.writePrompt('.prompts', 'greeting.prompt', `<Prompt name="greeting">
  Welcome

  This is a test prompt.
</Prompt>`);

      const result = env.exec('run cat -p greeting --no-interactive');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Welcome');
      expect(result.stdout).toContain('This is a test prompt');
    });
  });

  describe('template with inputs', () => {
    it('should use default values for inputs in non-interactive mode', async () => {
      await env.writeConfig({
        promptDirs: ['./.prompts'],
        version: '8.0.0',
      });

      // Write a prompt with an input that has a default value
      // Using pupt-lib's Ask.Text component
      await env.writePrompt('.prompts', 'input-test.prompt', `<Prompt name="input-test">
  <Ask.Text name="greeting" label="Greeting" default="Hello" />
  {inputs.greeting}, World!
</Prompt>`);

      const result = env.exec('run cat -p input-test --no-interactive');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Hello, World!');
    });
  });

  describe('error cases', () => {
    it('should error when prompt name not found', async () => {
      await env.writeConfig({
        promptDirs: ['./.prompts'],
        version: '8.0.0',
      });

      await env.writePrompt('.prompts', 'exists.prompt', `<Prompt name="exists">
  I exist
</Prompt>`);

      const result = env.exec('run cat -p nonexistent --no-interactive', { expectError: true });

      expect(result.exitCode).not.toBe(0);
    });

    it('should error when tool is not found', async () => {
      await env.writeConfig({
        promptDirs: ['./.prompts'],
        version: '8.0.0',
      });

      await env.writePrompt('.prompts', 'test.prompt', `<Prompt name="test">
  test content
</Prompt>`);

      const result = env.exec('run nonexistent-tool-xyz -p test --no-interactive', {
        expectError: true,
      });

      expect(result.exitCode).not.toBe(0);
    });
  });

  describe('history saving', () => {
    it('should save history when historyDir is configured', async () => {
      await env.writeConfig({
        promptDirs: ['./.prompts'],
        historyDir: './.pt-history',
        version: '8.0.0',
      });

      await env.writePrompt('.prompts', 'saveme.prompt', `<Prompt name="saveme">
  This should be saved
</Prompt>`);

      const result = env.exec('run cat -p saveme --no-interactive');

      expect(result.exitCode).toBe(0);

      // Check that a history file was created
      const historyFiles = await env.listDir('.pt-history');
      const jsonFiles = historyFiles.filter(f => f.endsWith('.json'));
      expect(jsonFiles.length).toBeGreaterThan(0);
    });

    it('should not create history when historyDir is not configured', async () => {
      await env.writeConfig({
        promptDirs: ['./.prompts'],
        // No historyDir
        version: '8.0.0',
      });

      await env.writePrompt('.prompts', 'nosave.prompt', `<Prompt name="nosave">
  This should not be saved
</Prompt>`);

      const result = env.exec('run cat -p nosave --no-interactive');

      expect(result.exitCode).toBe(0);

      // Check that no history directory was created
      const exists = await env.exists('.pt-history');
      expect(exists).toBe(false);
    });
  });

  describe('prompt discovery', () => {
    it('should find prompts by name attribute', async () => {
      await env.writeConfig({
        promptDirs: ['./.prompts'],
        version: '8.0.0',
      });

      // In pupt-lib, the `name` prop on Prompt is used for matching
      await env.writePrompt('.prompts', 'my-prompt-file.prompt', `<Prompt name="custom-name">
  Found by name
</Prompt>`);

      // Find by name attribute
      const result = env.exec('run cat -p custom-name --no-interactive');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Found by name');
    });

    it('should find prompts by filename without extension', async () => {
      await env.writeConfig({
        promptDirs: ['./.prompts'],
        version: '8.0.0',
      });

      // When name is the same as filename, can find by either
      await env.writePrompt('.prompts', 'findme.prompt', `<Prompt name="findme">
  Found by filename
</Prompt>`);

      // Find by filename
      const result = env.exec('run cat -p findme --no-interactive');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Found by filename');
    });

    it('should search multiple prompt directories', async () => {
      await env.writeConfig({
        promptDirs: ['./.prompts', './.more-prompts'],
        version: '8.0.0',
      });

      await env.writePrompt('.prompts', 'first.prompt', `<Prompt name="first">
  From first dir
</Prompt>`);

      await env.writePrompt('.more-prompts', 'second.prompt', `<Prompt name="second">
  From second dir
</Prompt>`);

      const result1 = env.exec('run cat -p first --no-interactive');
      expect(result1.exitCode).toBe(0);
      expect(result1.stdout).toContain('From first dir');

      const result2 = env.exec('run cat -p second --no-interactive');
      expect(result2.exitCode).toBe(0);
      expect(result2.stdout).toContain('From second dir');
    });
  });
});
