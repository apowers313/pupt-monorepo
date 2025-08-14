import { select, input, editor } from '@inquirer/prompts';
import fs from 'fs-extra';
import path from 'path';
import yaml from 'js-yaml';
import { v4 as uuidv4 } from 'uuid';
import { ConfigManager } from '../config/config-manager.js';
import { HistoryManager } from '../history/history-manager.js';
import { HistoryEntry } from '../types/history.js';
import { errors } from '../utils/errors.js';
import ora from 'ora';

interface AnnotationMetadata {
  historyFile: string;
  timestamp: string;
  status: 'success' | 'failure' | 'partial';
  tags: string[];
}

export async function annotateCommand(historyNumber?: number): Promise<void> {
  const config = await ConfigManager.load();
  
  if (!config.annotationDir) {
    throw errors.featureNotEnabled('Annotations', [
      'Track prompt success/failure',
      'Add tags for organization',
      'Record detailed notes'
    ]);
  }
  
  if (!config.historyDir) {
    throw errors.featureNotEnabled('History tracking', [
      'Track all your prompts',
      'Re-run previous prompts',
      'Add annotations'
    ]);
  }

  const historyManager = new HistoryManager(config.historyDir);
  
  let entry: HistoryEntry | null;
  
  if (historyNumber !== undefined) {
    const spinner = ora('Loading history entry...').start();
    entry = await historyManager.getHistoryEntry(historyNumber);
    spinner.stop();
    
    if (!entry) {
      const entries = await historyManager.listHistory();
      throw errors.historyNotFound(historyNumber, entries.length);
    }
  } else {
    const spinner = ora('Loading history...').start();
    const historyList = await historyManager.listHistory();
    spinner.stop();
    
    if (historyList.length === 0) {
      throw new Error('No history entries found. Run some prompts first to build history.');
    }
    
    const selectedIndex = await select({
      message: 'Select history entry to annotate:',
      choices: historyList.map((item, index) => ({
        name: formatHistoryChoice(item, index + 1),
        value: index
      }))
    });
    
    entry = historyList[selectedIndex];
  }

  const status = await select({
    message: 'How did this prompt work?',
    choices: [
      { value: 'success', name: '✓ Success' },
      { value: 'failure', name: '✗ Failure' },
      { value: 'partial', name: '~ Partial success' }
    ]
  }) as 'success' | 'failure' | 'partial';

  const tagsInput = await input({
    message: 'Tags (comma-separated, optional):'
  });

  const notes = await editor({
    message: 'Add notes (press enter to open editor):'
  });

  const metadata: AnnotationMetadata = {
    historyFile: path.basename(entry.filename),
    timestamp: new Date().toISOString(),
    status,
    tags: tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : []
  };

  const content = `---
${yaml.dump(metadata)}---

## Notes

${notes}
`;

  const historyBasename = path.basename(entry.filename, '.json');
  const filename = `${historyBasename}-annotation-${uuidv4()}.md`;
  const filepath = path.join(config.annotationDir, filename);
  
  const saveSpinner = ora('Saving annotation...').start();
  try {
    await fs.writeFile(filepath, content);
    saveSpinner.succeed(`Annotation saved to ${filepath}`);
  } catch (error) {
    saveSpinner.fail();
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'EACCES') {
      throw errors.permissionDenied(config.annotationDir);
    }
    throw error;
  }
}

function formatHistoryChoice(entry: HistoryEntry, index: number): string {
  const date = new Date(entry.timestamp);
  const dateStr = `[${date.toLocaleDateString()} ${date.toLocaleTimeString()}]`;
  const title = entry.title || 'Untitled';
  const firstLine = entry.finalPrompt.split('\n')[0];
  const truncated = firstLine.length > 50 
    ? firstLine.substring(0, 47) + '...'
    : firstLine;
  
  return `${index}. ${dateStr} ${title} - ${truncated}`;
}