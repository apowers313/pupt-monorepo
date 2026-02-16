import { program } from 'commander';

import { logger } from '../utils/logger.js';

export async function helpCommand(commandName?: string): Promise<void> {
  if (!commandName) {
    // Show general help (same as pt --help)
    program.outputHelp();
  } else {
    // Find the specific command
    const command = program.commands.find(cmd => cmd.name() === commandName);
    
    if (command) {
      // Show help for specific command (same as pt <command> --help)
      command.outputHelp();
    } else {
      logger.error(`Unknown command: ${commandName}`);
      logger.log('\nAvailable commands:');
      program.commands.forEach(cmd => {
        logger.log(`  ${cmd.name()}${cmd.description() ? ` - ${cmd.description()}` : ''}`);
      });
      process.exit(1);
    }
  }
}