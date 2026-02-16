import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { LocalPromptSource } from 'pupt-lib';

let testDir: string;

vi.mock('@/config/global-paths', () => ({
  getConfigDir: () => testDir,
  getDataDir: () => path.join(testDir, 'data'),
  getCacheDir: () => path.join(testDir, 'cache'),
  getConfigPath: () => path.join(testDir, 'config.json'),
}));

// Import after mock setup
const { ConfigManager } = await import('../../src/config/config-manager.js');

describe('Full Integration Flow', () => {
  let originalCwd: string;

  beforeEach(async () => {
    // Create a temporary test directory
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pt-test-'));
    testDir = fs.realpathSync(tempDir);
    originalCwd = process.cwd();
    process.chdir(testDir);
  });

  afterEach(async () => {
    // Clean up
    process.chdir(originalCwd);
    await fs.remove(testDir);
  });

  describe('Complete User Journey', () => {
    it('should support full workflow from init to annotate', async () => {
      const dataDir = path.join(testDir, 'data');

      // 1. Initialize configuration
      const config = {
        promptDirs: ['./.prompts'],
        historyDir: './.pthistory',
        annotationDir: './.pthistory',
        defaultCmd: 'echo',
        defaultCmdArgs: [],
        defaultCmdOptions: {},
        version: '3.0.0'
      };
      await fs.writeJson(path.join(testDir, 'config.json'), config);
      await fs.ensureDir('./.prompts');
      await fs.ensureDir('./.pthistory');

      // 2. Create a prompt file (.prompt JSX format)
      const promptContent = `<Prompt name="test-prompt" description="A test prompt" tags={["test"]}>
  <Task>This is a test prompt with some content</Task>
</Prompt>`;

      await fs.writeFile('./.prompts/test-prompt.prompt', promptContent);

      // 3. Verify prompt discovery via PuptService
      const { PuptService } = await import('../../src/services/pupt-service.js');
      const puptService = new PuptService({ modules: [new LocalPromptSource(path.resolve('./.prompts'))] });
      await puptService.init();
      const prompts = puptService.getPromptsAsAdapted();

      expect(prompts).toHaveLength(1);
      expect(prompts[0].title).toBe('A test prompt'); // Uses description as human-friendly title

      // 4. Verify the prompt was created correctly
      const savedPromptContent = await fs.readFile('./.prompts/test-prompt.prompt', 'utf-8');
      expect(savedPromptContent).toContain('This is a test prompt with some content');

      // 5. Save to history
      const { HistoryManager } = await import('../../src/history/history-manager.js');
      const historyManager = new HistoryManager('./.pthistory');

      const filename = await historyManager.savePrompt({
        templatePath: './.prompts/test-prompt.prompt',
        templateContent: promptContent,
        variables: new Map([['name', 'TestUser']]),
        finalPrompt: 'This is a test prompt with some content',
        title: 'test-prompt'
      });

      expect(filename).toMatch(/^\d{8}-\d{6}-[a-f0-9]{8}\.json$/);

      // 6. List history
      const entries = await historyManager.listHistory();
      expect(entries).toHaveLength(1);
      expect(entries[0].title).toBe('test-prompt');

      // 7. Get specific history entry
      const entry = await historyManager.getHistoryEntry(1);
      expect(entry).toBeDefined();
      expect(entry?.title).toBe('test-prompt');

      // 8. Create annotation
      const annotationData = {
        historyFile: filename,
        timestamp: new Date().toISOString(),
        status: 'success',
        tags: ['test', 'integration'],
        notes: 'This test was successful.'
      };

      const annotationPath = path.join('./.pthistory', `${filename.replace('.json', '')}-annotation-test.json`);
      await fs.writeJson(annotationPath, annotationData, { spaces: 2 });

      // Verify annotation was created
      const annotationExists = await fs.pathExists(annotationPath);
      expect(annotationExists).toBe(true);
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should handle missing configuration gracefully', async () => {
      const dataDir = path.join(testDir, 'data');

      // Should create default config when missing
      const config = await ConfigManager.load();
      expect(config.promptDirs).toEqual([path.join(dataDir, 'prompts')]);
    });

    it('should handle prompt files without errors', async () => {
      await fs.ensureDir('./.prompts');
      // Create a valid .prompt file
      await fs.writeFile('./.prompts/simple.prompt', '<Prompt name="simple" description="Simple prompt" tags={[]}><Task>Simple content</Task></Prompt>');

      const { PuptService } = await import('../../src/services/pupt-service.js');
      const puptService = new PuptService({ modules: [new LocalPromptSource(path.resolve('./.prompts'))] });
      await puptService.init();
      const prompts = puptService.getPromptsAsAdapted();

      // Should discover the file
      expect(prompts).toHaveLength(1);
      expect(prompts[0].title).toBe('Simple prompt'); // Uses description as human-friendly title
    });

    it('should handle missing history directory', async () => {
      const { HistoryManager } = await import('../../src/history/history-manager.js');
      const historyManager = new HistoryManager('./non-existent-history');

      // Should create directory on save
      await historyManager.savePrompt({
        templatePath: 'test.prompt',
        templateContent: 'test',
        variables: new Map(),
        finalPrompt: 'test',
        title: 'Test'
      });

      const exists = await fs.pathExists('./non-existent-history');
      expect(exists).toBe(true);
    });

    it('should handle template processing via PuptService render', async () => {
      await fs.ensureDir('./.prompts');
      // Create a prompt that renders content
      await fs.writeFile('./.prompts/render-test.prompt', '<Prompt name="render-test" description="Render test" tags={[]}><Task>Hello World</Task></Prompt>');

      const { PuptService } = await import('../../src/services/pupt-service.js');
      const puptService = new PuptService({ modules: [new LocalPromptSource(path.resolve('./.prompts'))] });
      await puptService.init();

      const prompt = puptService.findPrompt('render-test');
      expect(prompt).toBeDefined();

      const result = await prompt!.render();
      expect(result.text).toContain('Hello World');
    });
  });

  describe('Command Integration', () => {
    it('should handle all commands with various configurations', async () => {
      // Test with minimal config
      const minimalConfig = {
        promptDirs: ['./.prompts']
      };
      await fs.writeJson(path.join(testDir, 'config.json'), minimalConfig);
      await fs.ensureDir('./.prompts');

      // Create a simple prompt
      await fs.writeFile('./.prompts/simple.prompt', '<Prompt name="simple" description="Simple" tags={[]}><Task>Hello World!</Task></Prompt>');

      // Test prompt discovery works
      const { PuptService } = await import('../../src/services/pupt-service.js');
      const puptService = new PuptService({ modules: [new LocalPromptSource(path.resolve('./.prompts'))] });
      await puptService.init();
      const prompts = puptService.getPromptsAsAdapted();
      expect(prompts).toHaveLength(1);

      // Test with full config
      const fullConfig = {
        promptDirs: ['./.prompts', './templates'],
        historyDir: './history',
        annotationDir: './annotations',
        defaultCmd: 'cat',
        defaultCmdArgs: ['-n'],
        defaultCmdOptions: {
          'Show line numbers?': '--number'
        },
        version: '3.0.0'
      };
      await fs.writeJson(path.join(testDir, 'config.json'), fullConfig);
      await fs.ensureDir('./templates');

      // Create prompt in second directory
      await fs.writeFile('./templates/template.prompt', '<Prompt name="template" description="Template" tags={[]}><Task>Template content</Task></Prompt>');

      // Test discovery from multiple directories
      const multiPuptService = new PuptService({ modules: [new LocalPromptSource(path.resolve('./.prompts')), new LocalPromptSource(path.resolve('./templates'))] });
      await multiPuptService.init();
      const multiPrompts = multiPuptService.getPromptsAsAdapted();
      expect(multiPrompts).toHaveLength(2);
    });
  });

  describe('Cancellation Handling', () => {
    it('should handle user cancellation gracefully', async () => {
      // Mock user cancellation
      const originalExit = process.exit;
      const exitMock = vi.fn();
      process.exit = exitMock as any;

      // Simulate Ctrl+C during processing
      process.emit('SIGINT');

      // Should handle gracefully
      expect(exitMock).not.toHaveBeenCalled();

      process.exit = originalExit;
    });
  });
});
