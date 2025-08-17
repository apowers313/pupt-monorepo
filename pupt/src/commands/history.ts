import chalk from 'chalk';
import { ConfigManager } from '../config/config-manager.js';
import { HistoryManager } from '../history/history-manager.js';
import { errors } from '../utils/errors.js';

interface HistoryOptions {
  limit?: number;
  all?: boolean;
  entry?: number;
}

export async function historyCommand(options: HistoryOptions): Promise<void> {
  // Load config
  const config = await ConfigManager.load();
  
  // Check if history is enabled
  if (!config.historyDir) {
    throw errors.featureNotEnabled('History tracking', [
      'Track all your prompts',
      'Re-run previous prompts',
      'Add annotations'
    ]);
  }

  // Create history manager
  const historyManager = new HistoryManager(config.historyDir);

  // If a specific entry is requested, show its full content
  if (options.entry !== undefined) {
    const entry = await historyManager.getHistoryEntry(options.entry);
    
    if (!entry) {
      console.log(chalk.red(`History entry ${options.entry} not found`));
      const totalCount = await historyManager.getTotalCount();
      if (totalCount > 0) {
        console.log(chalk.dim(`Available entries: 1-${totalCount}`));
      }
      return;
    }

    // Display full entry details
    console.log(chalk.bold(`\nHistory Entry #${options.entry}:`));
    console.log(chalk.gray('─'.repeat(80)));
    
    console.log(chalk.cyan('Timestamp:') + ` ${formatDate(entry.timestamp)}`);
    console.log(chalk.cyan('Title:') + ` ${entry.title || 'Untitled'}`);
    console.log(chalk.cyan('Template:') + ` ${entry.templatePath}`);
    
    if (Object.keys(entry.variables).length > 0) {
      console.log(chalk.cyan('\nVariables:'));
      for (const [key, value] of Object.entries(entry.variables)) {
        console.log(`  ${chalk.green(key)}: ${JSON.stringify(value)}`);
      }
    }
    
    console.log(chalk.cyan('\nFinal Prompt:'));
    console.log(chalk.gray('─'.repeat(80)));
    console.log(entry.finalPrompt);
    console.log(chalk.gray('─'.repeat(80)));
    
    console.log(chalk.dim(`\nHistory file: ${entry.filename}`));
    return;
  }

  // Determine limit
  let limit: number | undefined;
  if (options.all) {
    limit = undefined;
  } else if (options.limit) {
    limit = options.limit;
  } else {
    limit = 20; // Default limit
  }

  // Get total count of entries for proper numbering
  const totalCount = await historyManager.getTotalCount();
  
  // Get history entries
  const entries = await historyManager.listHistory(limit);

  // Handle empty history
  if (entries.length === 0) {
    console.log(chalk.yellow('📋 No history found'));
    console.log(chalk.dim('\nRun some prompts to build your history:'));
    console.log(chalk.dim('  • pt                  - Interactive prompt selection'));
    console.log(chalk.dim('  • pt run <tool>       - Run with specific tool'));
    console.log(chalk.dim('  • pt run              - Run with default tool'));
    return;
  }

  // Display header
  console.log(chalk.bold('\nPrompt History:'));
  console.log(chalk.gray('─'.repeat(80)));

  // Calculate starting number based on total count and entries shown
  const startNum = totalCount - entries.length + 1;

  // Display entries
  entries.forEach((entry, index) => {
    const num = startNum + index;
    const date = formatDate(entry.timestamp);
    const title = entry.title || 'Untitled';
    const prompt = truncatePrompt(entry.finalPrompt, 60);

    console.log(chalk.cyan(`${num}.`) + chalk.gray(` [${date}] `) + chalk.white(title));
    console.log('   ' + chalk.gray(prompt));
    console.log('');
  });
}

function formatDate(timestamp: string): string {
  const date = new Date(timestamp);
  // Use local time methods to display in user's timezone
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function truncatePrompt(prompt: string, maxLength: number): string {
  if (prompt.length <= maxLength) {
    return prompt;
  }
  return prompt.substring(0, maxLength) + '...';
}