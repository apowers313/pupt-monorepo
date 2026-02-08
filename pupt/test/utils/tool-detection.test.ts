import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detectInstalledTools, getToolByName, SUPPORTED_TOOLS, isInteractiveTUI } from '../../src/utils/tool-detection.js';
import { sync as commandExistsSync } from 'command-exists';

// Mock command-exists module
vi.mock('command-exists');

describe('tool-detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('detectInstalledTools', () => {
    it('should detect Claude when installed', () => {
      vi.mocked(commandExistsSync).mockImplementation((cmd: string) => cmd === 'claude');

      const tools = detectInstalledTools();
      
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('claude');
      expect(tools[0].displayName).toBe('Claude');
    });

    it('should detect Kiro when installed', () => {
      vi.mocked(commandExistsSync).mockImplementation((cmd: string) => cmd === 'kiro-cli');

      const tools = detectInstalledTools();

      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('kiro');
      expect(tools[0].displayName).toBe('Kiro');
    });

    it('should detect both tools when both are installed', () => {
      vi.mocked(commandExistsSync).mockReturnValue(true);

      const tools = detectInstalledTools();
      
      expect(tools).toHaveLength(2);
      expect(tools.map(t => t.name)).toEqual(['claude', 'kiro']);
    });

    it('should return empty array when no tools are installed', () => {
      vi.mocked(commandExistsSync).mockReturnValue(false);

      const tools = detectInstalledTools();
      
      expect(tools).toHaveLength(0);
    });
  });

  describe('getToolByName', () => {
    it('should return Claude config when requested', () => {
      const tool = getToolByName('claude');
      
      expect(tool).toBeDefined();
      expect(tool?.name).toBe('claude');
      expect(tool?.command).toBe('claude');
      expect(tool?.defaultArgs).toEqual(['--permission-mode', 'acceptEdits']);
      expect(tool?.defaultOptions).toEqual({
        'Continue with last context?': '--continue'
      });
    });

    it('should return Kiro config when requested', () => {
      const tool = getToolByName('kiro');

      expect(tool).toBeDefined();
      expect(tool?.name).toBe('kiro');
      expect(tool?.command).toBe('kiro-cli');
      expect(tool?.defaultArgs).toEqual([]);
      expect(tool?.defaultOptions).toEqual({});
    });

    it('should return undefined for unknown tool', () => {
      const tool = getToolByName('unknown');
      
      expect(tool).toBeUndefined();
    });
  });

  describe('SUPPORTED_TOOLS', () => {
    it('should have Claude and Kiro configured', () => {
      expect(SUPPORTED_TOOLS).toHaveLength(2);
      expect(SUPPORTED_TOOLS.map(t => t.name)).toEqual(['claude', 'kiro']);
    });
  });

  describe('isInteractiveTUI', () => {
    it('should return true for claude', () => {
      expect(isInteractiveTUI('claude')).toBe(true);
    });

    it('should return true for kiro-cli', () => {
      expect(isInteractiveTUI('kiro-cli')).toBe(true);
    });

    it('should return false for other tools', () => {
      expect(isInteractiveTUI('cat')).toBe(false);
      expect(isInteractiveTUI('gpt')).toBe(false);
      expect(isInteractiveTUI('code')).toBe(false);
    });
  });
});