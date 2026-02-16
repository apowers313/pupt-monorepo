import type { KeyDescriptor } from '@inquirer/testing';
import { render } from '@inquirer/testing';

import { runCommand } from '../../src/commands/run.js';

export interface TestRunOptions {
  promptName?: string;
  inputs?: Record<string, string>;
  keySequence?: (string | KeyDescriptor)[];
  command?: string;
  commandArgs?: string[];
  outputCapture?: boolean;
}

export class TestRunner {
  private cwd: string;

  constructor(testDirectory: string) {
    this.cwd = testDirectory;
  }

  /**
   * Run a prompt non-interactively with predefined inputs
   */
  async runPrompt(options: TestRunOptions = {}): Promise<{
    exitCode: number | null;
    output?: string;
    historyFile?: string;
  }> {
    const originalCwd = process.cwd();
    process.chdir(this.cwd);

    try {
      // If prompt name is provided, we can skip the interactive selection
      // by directly providing the prompt info to runCommand
      if (options.promptName) {
        // Find the prompt file
        const { PromptManager } = await import('../../src/prompts/prompt-manager.js');
        const { ConfigManager } = await import('../../src/config/config-manager.js');
        
        const config = await ConfigManager.load();
        const promptManager = new PromptManager(config.promptDirs);
        const prompts = await promptManager.discoverPrompts();
        const selectedPrompt = prompts.find(p => 
          p.name === options.promptName || 
          p.title === options.promptName
        );

        if (!selectedPrompt) {
          throw new Error(`Prompt not found: ${options.promptName}`);
        }

        // Create template info with predefined inputs
        const templateInfo = {
          templatePath: selectedPrompt.path,
          templateContent: selectedPrompt.content,
          variables: new Map(Object.entries(options.inputs || {})),
          finalPrompt: selectedPrompt.content, // Will be processed
          title: selectedPrompt.title,
          summary: selectedPrompt.summary
        };

        // Run the command with skip prompt selection
        const result = await runCommand(
          options.commandArgs || [],
          {
            skipPromptSelection: true,
            templateInfo,
            prompt: selectedPrompt.content
          }
        );

        return {
          exitCode: 0,
          historyFile: result as unknown as string
        };
      } else if (options.keySequence) {
        // Use inquirer testing to simulate interactive selection
        const { promise, events, getScreen } = await render(runCommand, [
          options.commandArgs || [],
          {}
        ]);

        // Execute the key sequence
        for (const key of options.keySequence) {
          if (typeof key === 'string') {
            events.type(key);
          } else {
            events.keypress(key);
          }
        }

        const result = await promise;
        const screen = getScreen();

        return {
          exitCode: 0,
          output: screen.join('\n'),
          historyFile: result as unknown as string
        };
      } 
        throw new Error('Either promptName or keySequence must be provided');
      
    } finally {
      process.chdir(originalCwd);
    }
  }

  /**
   * Run a command that will execute with a specific prompt without user interaction
   */
  async runNonInteractive(
    promptName: string,
    command: string = 'echo',
    inputs: Record<string, string> = {}
  ): Promise<{
    exitCode: number | null;
    historyFile?: string;
    outputFile?: string;
  }> {
    // Mock the necessary modules to bypass interactivity
    const inquirerMocks = await import('../mocks/inquirer-mocks.js');
    inquirerMocks.setupInquirerMocks({
      promptSelection: promptName,
      inputs
    });

    try {
      const result = await this.runPrompt({
        promptName,
        inputs,
        commandArgs: [command]
      });

      return result;
    } finally {
      inquirerMocks.restoreInquirerMocks();
    }
  }
}