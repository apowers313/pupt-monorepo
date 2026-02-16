import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { HistoryManager } from '../../src/history/history-manager';

describe('History Timestamp Formatting', () => {
  let tempDir: string;
  let historyManager: HistoryManager;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pt-history-timestamp-'));
    historyManager = new HistoryManager(tempDir);
  });

  afterEach(async () => {
    await fs.remove(tempDir);
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Local timezone formatting', () => {
    it('should use local timezone for history filename', async () => {
      // Mock the date
      const mockDate = new Date('2024-01-15T14:30:45.123Z');
      vi.setSystemTime(mockDate);

      const filename = await historyManager.savePrompt({
        templatePath: 'test.md',
        templateContent: 'Test content',
        variables: new Map(),
        finalPrompt: 'Test prompt'
      });

      // Filename should be in local time format
      expect(filename).toMatch(/^\d{8}-\d{6}-[a-f0-9]{8}\.json$/);
      
      // Parse the filename to check the date/time parts
      const [datePart, timePart] = filename.split('-');
      expect(datePart).toBe('20240115'); // Date in YYYYMMDD format
      expect(timePart).toMatch(/^\d{6}$/); // Time in HHMMSS format
    });

    it('should store UTC timestamp in file content', async () => {
      const mockDate = new Date('2024-01-15T14:30:45.123Z');
      vi.setSystemTime(mockDate);

      const filename = await historyManager.savePrompt({
        templatePath: 'test.md',
        templateContent: 'Test content',
        variables: new Map(),
        finalPrompt: 'Test prompt'
      });

      const filePath = path.join(tempDir, filename);
      const content = await fs.readJson(filePath);

      // Content should have ISO timestamp
      expect(content.timestamp).toBe('2024-01-15T14:30:45.123Z');
    });

    it('should format display timestamp in local timezone', async () => {
      const mockDate = new Date('2024-01-15T14:30:45.123Z');
      vi.setSystemTime(mockDate);

      const filename = await historyManager.savePrompt({
        templatePath: 'test.md',
        templateContent: 'Test content',
        variables: new Map(),
        finalPrompt: 'Test prompt',
        title: 'Test Entry'
      });

      const entries = await historyManager.listHistory();
      expect(entries).toHaveLength(1);
      
      const entry = entries[0];
      expect(entry.timestamp).toBe('2024-01-15T14:30:45.123Z');
      
      // For display, we would format this using toLocaleString()
      const displayDate = new Date(entry.timestamp).toLocaleString();
      expect(displayDate).toContain('2024');
    });

    it('should handle different timezones consistently', async () => {
      // Test with different timezone offsets
      const dates = [
        new Date('2024-01-15T00:00:00.000Z'), // UTC midnight
        new Date('2024-01-15T23:59:59.999Z'), // UTC end of day
        new Date('2024-06-15T12:00:00.000Z'), // Summer time
        new Date('2024-12-15T12:00:00.000Z')  // Winter time
      ];

      for (const testDate of dates) {
        vi.setSystemTime(testDate);
        
        const filename = await historyManager.savePrompt({
          templatePath: 'test.md',
          templateContent: 'Test content',
          variables: new Map(),
          finalPrompt: `Test prompt at ${testDate.toISOString()}`
        });

        expect(filename).toMatch(/^\d{8}-\d{6}-[a-f0-9]{8}\.json$/);
        
        // Verify the file was created
        const filePath = path.join(tempDir, filename);
        expect(await fs.pathExists(filePath)).toBe(true);
      }
    });

    it('should generate unique filenames for rapid saves', async () => {
      const mockDate = new Date('2024-01-15T14:30:45.123Z');
      vi.setSystemTime(mockDate);

      // Save multiple entries at the same timestamp
      const filenames = new Set<string>();
      
      for (let i = 0; i < 5; i++) {
        const filename = await historyManager.savePrompt({
          templatePath: 'test.md',
          templateContent: 'Test content',
          variables: new Map(),
          finalPrompt: `Test prompt ${i}`
        });
        
        filenames.add(filename);
      }

      // All filenames should be unique due to random suffix
      expect(filenames.size).toBe(5);
    });
  });

  describe('History display formatting', () => {
    it('should format timestamps for display using local timezone', async () => {
      // Create a history entry with a known timestamp
      const testDate = new Date('2024-01-15T14:30:45.123Z');
      const entry = {
        timestamp: testDate.toISOString(),
        templatePath: 'test.md',
        templateContent: 'Test content',
        variables: {},
        finalPrompt: 'Test prompt',
        title: 'Test Entry'
      };

      const filename = `20240115-143045-12345678.json`;
      await fs.writeJson(path.join(tempDir, filename), entry);

      const entries = await historyManager.listHistory();
      expect(entries).toHaveLength(1);
      
      // The timestamp should be preserved as ISO string
      expect(entries[0].timestamp).toBe(testDate.toISOString());
      
      // For display purposes, calling code should format using toLocaleString
      const localDisplay = new Date(entries[0].timestamp).toLocaleString();
      expect(typeof localDisplay).toBe('string');
      expect(localDisplay.length).toBeGreaterThan(0);
    });
  });
});