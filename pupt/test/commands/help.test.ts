import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { helpCommand } from '../../src/commands/help.js';
import { program } from 'commander';

// Mock the logger module
vi.mock('../../src/utils/logger.js', () => ({
  logger: {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }
}));

// Import mocked logger
import { logger } from '../../src/utils/logger.js';

describe('help command', () => {
  let mockExit: any;
  let outputHelpSpy: any;
  let mockCommands: any[];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock process.exit
    mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });

    // Mock program.outputHelp
    outputHelpSpy = vi.spyOn(program, 'outputHelp').mockImplementation(() => {});

    // Create mock commands with their own outputHelp methods
    mockCommands = [
      {
        name: () => 'init',
        description: () => 'Initialize a new prompt tool configuration',
        outputHelp: vi.fn()
      },
      {
        name: () => 'add',
        description: () => 'Create a new prompt interactively',
        outputHelp: vi.fn()
      },
      {
        name: () => 'edit',
        description: () => 'Edit an existing prompt in your editor',
        outputHelp: vi.fn()
      },
      {
        name: () => 'run',
        description: () => 'Execute a prompt with an external tool',
        outputHelp: vi.fn()
      },
      {
        name: () => 'history',
        description: () => 'Show prompt execution history or a specific entry',
        outputHelp: vi.fn()
      },
      {
        name: () => 'annotate',
        description: () => 'Add notes to a history entry',
        outputHelp: vi.fn()
      },
      {
        name: () => 'install',
        description: () => 'Install prompts from a git repository or npm package',
        outputHelp: vi.fn()
      },
      {
        name: () => 'example',
        description: () => 'Create an example prompt in the current directory',
        outputHelp: vi.fn()
      },
      {
        name: () => 'help',
        description: () => 'Display help information for a command',
        outputHelp: vi.fn()
      }
    ];

    // Mock program.commands
    vi.spyOn(program, 'commands', 'get').mockReturnValue(mockCommands);
  });

  afterEach(() => {
    mockExit.mockRestore();
  });

  describe('general help (pt help)', () => {
    it('should display general help when no command is specified', async () => {
      await helpCommand();

      expect(outputHelpSpy).toHaveBeenCalledOnce();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should behave the same as pt --help', async () => {
      // Test pt help
      await helpCommand();
      expect(outputHelpSpy).toHaveBeenCalledTimes(1);

      // Reset
      outputHelpSpy.mockClear();

      // Simulate pt --help by calling program.outputHelp directly
      program.outputHelp();
      expect(outputHelpSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('command-specific help (pt help <command>)', () => {
    it('should display help for a specific command', async () => {
      await helpCommand('init');

      const initCommand = mockCommands.find(cmd => cmd.name() === 'init');
      expect(initCommand?.outputHelp).toHaveBeenCalledOnce();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should work with all existing commands', async () => {
      const commandNames = ['init', 'add', 'edit', 'run', 'history', 'annotate', 'install', 'example', 'help'];

      for (const cmdName of commandNames) {
        // Clear mocks
        mockCommands.forEach(cmd => cmd.outputHelp.mockClear());
        vi.mocked(logger.error).mockClear();

        await helpCommand(cmdName);

        const command = mockCommands.find(cmd => cmd.name() === cmdName);
        expect(command?.outputHelp).toHaveBeenCalledOnce();
        expect(logger.error).not.toHaveBeenCalled();
      }
    });

    it('should behave the same as pt <command> --help', async () => {
      const commandName = 'run';
      const runCommand = mockCommands.find(cmd => cmd.name() === commandName);

      // Test pt help run
      await helpCommand(commandName);
      expect(runCommand?.outputHelp).toHaveBeenCalledTimes(1);

      // Reset
      runCommand?.outputHelp.mockClear();

      // Simulate pt run --help
      runCommand?.outputHelp();
      expect(runCommand?.outputHelp).toHaveBeenCalledTimes(1);
    });

    it('should handle unknown commands gracefully', async () => {
      await expect(helpCommand('unknown-command')).rejects.toThrow('process.exit');

      expect(logger.error).toHaveBeenCalledWith('Unknown command: unknown-command');
      expect(logger.log).toHaveBeenCalledWith('\nAvailable commands:');
      
      // Check that all commands are listed
      mockCommands.forEach(cmd => {
        expect(logger.log).toHaveBeenCalledWith(
          expect.stringContaining(cmd.name())
        );
      });

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('should list available commands when an unknown command is provided', async () => {
      await expect(helpCommand('nonexistent')).rejects.toThrow('process.exit');

      expect(logger.log).toHaveBeenCalledWith('\nAvailable commands:');
      expect(logger.log).toHaveBeenCalledWith('  init - Initialize a new prompt tool configuration');
      expect(logger.log).toHaveBeenCalledWith('  add - Create a new prompt interactively');
      expect(logger.log).toHaveBeenCalledWith('  edit - Edit an existing prompt in your editor');
      expect(logger.log).toHaveBeenCalledWith('  run - Execute a prompt with an external tool');
      expect(logger.log).toHaveBeenCalledWith('  history - Show prompt execution history or a specific entry');
      expect(logger.log).toHaveBeenCalledWith('  annotate - Add notes to a history entry');
      expect(logger.log).toHaveBeenCalledWith('  install - Install prompts from a git repository or npm package');
      expect(logger.log).toHaveBeenCalledWith('  example - Create an example prompt in the current directory');
      expect(logger.log).toHaveBeenCalledWith('  help - Display help information for a command');
    });
  });

  describe('dynamic command discovery', () => {
    it('should work with newly added commands', async () => {
      // Add a new mock command
      const newCommand = {
        name: () => 'new-command',
        description: () => 'A newly added command',
        outputHelp: vi.fn()
      };

      const updatedCommands = [...mockCommands, newCommand];
      vi.spyOn(program, 'commands', 'get').mockReturnValue(updatedCommands);

      // Test that help works with the new command
      await helpCommand('new-command');

      expect(newCommand.outputHelp).toHaveBeenCalledOnce();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should list newly added commands in available commands', async () => {
      // Add a new mock command
      const newCommand = {
        name: () => 'future-command',
        description: () => 'A future command',
        outputHelp: vi.fn()
      };

      const updatedCommands = [...mockCommands, newCommand];
      vi.spyOn(program, 'commands', 'get').mockReturnValue(updatedCommands);

      // Try to get help for unknown command to see the list
      await expect(helpCommand('unknown')).rejects.toThrow('process.exit');

      expect(logger.log).toHaveBeenCalledWith('  future-command - A future command');
    });
  });
});