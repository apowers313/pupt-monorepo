import chalk from 'chalk';
import { ConfigManager } from '../config/config-manager.js';
import { HistoryManager } from '../history/history-manager.js';
import { errors } from '../utils/errors.js';
import ora from 'ora';

interface HistoryOptions {
  limit?: number;
  all?: boolean;
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

  // Determine limit
  let limit: number | undefined;
  if (options.all) {
    limit = undefined;
  } else if (options.limit) {
    limit = options.limit;
  } else {
    limit = 20; // Default limit
  }

  // Get history entries
  const spinner = ora('Loading history...').start();
  const entries = await historyManager.listHistory(limit);
  spinner.stop();

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

  // Display entries
  entries.forEach((entry, index) => {
    const num = index + 1;
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
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function truncatePrompt(prompt: string, maxLength: number): string {
  if (prompt.length <= maxLength) {
    return prompt;
  }
  return prompt.substring(0, maxLength) + '...';
}