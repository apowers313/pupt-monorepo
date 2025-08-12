import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HistoryManager } from '../../src/history/history-manager.js';
import * as fs from 'fs-extra';
import * as path from 'path';

vi.mock('fs-extra', () => ({
  ensureDir: vi.fn(),
  writeFile: vi.fn(),
  readdir: vi.fn(),
  readFile: vi.fn(),
}));

vi.mock('../../src/utils/platform.js', () => ({
  getUsername: vi.fn().mockReturnValue('testuser'),
}));

describe('HistoryManager', () => {
  let manager: HistoryManager;
  const testHistoryDir = '/path/to/history';
  const mockDate = new Date('2024-01-15T10:30:45.123Z');

  beforeEach(() => {
    vi.clearAllMocks();
    vi.setSystemTime(mockDate);
    vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    manager = new HistoryManager(testHistoryDir);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should save prompt to history with correct metadata', async () => {
    const options = {
      templatePath: '/templates/api-client.md',
      templateContent: 'Generate API client for {{service}}',
      variables: new Map([
        ['service', 'weather'],
        ['apiKey', 'secret123'],
      ]),
      finalPrompt: 'Generate API client for weather',
    };

    await manager.savePrompt(options);

    expect(fs.ensureDir).toHaveBeenCalledWith(testHistoryDir);
    expect(fs.writeFile).toHaveBeenCalled();

    const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
    const filePath = writeCall[0] as string;
    const content = writeCall[1] as string;

    // Check filename format
    expect(filePath).toMatch(/2024-01-15T10-30-45-123Z_api-client_[a-f0-9]{6}\.md$/);

    // Check content includes frontmatter and prompt
    expect(content).toContain('---');
    expect(content).toContain('Generate API client for weather');
    expect(content).toContain('template:');
    expect(content).toContain('path: /templates/api-client.md');
    expect(content).toContain('execution:');
    expect(content).toContain('date: \'2024-01-15\'');
    expect(content).toContain('user: testuser');
  });

  it('should mask sensitive variables in history', async () => {
    const options = {
      templatePath: '/templates/db-connection.md',
      templateContent: 'Connect to {{database}} with {{password}}',
      variables: new Map([
        ['database', 'postgres'],
        ['password', 'secret123'],
        ['apiKey', 'key123'],
      ]),
      finalPrompt: 'Connect to postgres with secret123',
    };

    await manager.savePrompt(options);

    const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
    const content = writeCall[1] as string;

    // Check that sensitive values are masked
    expect(content).toContain('password: \'***\'');
    expect(content).toContain('apiKey: \'***\'');
    expect(content).toContain('database: postgres');
  });

  it('should handle save errors gracefully', async () => {
    vi.mocked(fs.writeFile).mockRejectedValue(new Error('Permission denied'));

    const options = {
      templatePath: '/templates/test.md',
      templateContent: 'Test prompt',
      variables: new Map(),
      finalPrompt: 'Test prompt',
    };

    await expect(manager.savePrompt(options)).rejects.toThrow('Failed to save prompt to history');
  });

  it('should list history entries sorted by date', async () => {
    const mockFiles = [
      '2024-01-15T10-00-00-000Z_prompt1_abc123.md',
      '2024-01-16T10-00-00-000Z_prompt2_def456.md',
      '2024-01-14T10-00-00-000Z_prompt3_ghi789.md',
      'not-a-history-file.txt',
    ];

    vi.mocked(fs.readdir).mockResolvedValue(mockFiles as any);
    vi.mocked(fs.readFile).mockImplementation(async (filePath: any) => {
      const filename = path.basename(filePath);
      if (filename.includes('prompt1')) {
        return '---\ntemplate:\n  path: /templates/prompt1.md\n---\nPrompt 1 content';
      } else if (filename.includes('prompt2')) {
        return '---\ntemplate:\n  path: /templates/prompt2.md\n---\nPrompt 2 content';
      } else {
        return '---\ntemplate:\n  path: /templates/prompt3.md\n---\nPrompt 3 content';
      }
    });

    const entries = await manager.listHistory(10);

    expect(entries).toHaveLength(3);
    expect(entries[0].filename).toContain('prompt2');
    expect(entries[1].filename).toContain('prompt1');
    expect(entries[2].filename).toContain('prompt3');
  });

  it('should get a specific history entry', async () => {
    const filename = '2024-01-15T10-00-00-000Z_test_abc123.md';
    const content = `---
template:
  path: /templates/test.md
  hash: abc123
execution:
  date: 2024-01-15
  user: testuser
variables:
  name: TestProject
---
Generate project TestProject`;

    vi.mocked(fs.readFile).mockResolvedValue(content);

    const entry = await manager.getEntry(filename);

    expect(entry).toBeDefined();
    expect(entry.metadata.template.path).toBe('/templates/test.md');
    expect(entry.metadata.variables.name).toBe('TestProject');
    expect(entry.content).toBe('Generate project TestProject');
  });
});