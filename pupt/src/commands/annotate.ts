import { select, input, editor } from '@inquirer/prompts';
import fs from 'fs-extra';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { ConfigManager } from '../config/config-manager.js';
import { HistoryManager } from '../history/history-manager.js';
import { HistoryEntry } from '../types/history.js';
import { errors } from '../utils/errors.js';
import { DateFormats } from '../utils/date-formatter.js';
import { logger } from '../utils/logger.js';
import { AnnotationMetadata } from '../types/annotations.js';

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

  const historyManager = new HistoryManager(config.historyDir, config.annotationDir);
  
  let entry: HistoryEntry | null;
  
  if (historyNumber !== undefined) {
    entry = await historyManager.getHistoryEntry(historyNumber);
    
    if (!entry) {
      const entries = await historyManager.listHistory();
      throw errors.historyNotFound(historyNumber, entries.length);
    }
  } else {
    const historyList = await historyManager.listHistory();
    
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
    timestamp: DateFormats.UTC_DATETIME(new Date()),
    status,
    tags: tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : []
  };

  // Create JSON annotation with all data
  const annotationData = {
    ...metadata,
    notes
  };

  const historyBasename = path.basename(entry.filename, '.json');
  const filename = `${historyBasename}-annotation-${uuidv4()}.json`;
  const filepath = path.join(config.annotationDir, filename);
  
  try {
    await fs.writeJson(filepath, annotationData, { spaces: 2 });
    logger.log(`✅ Annotation saved to ${filepath}`);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'EACCES') {
      throw errors.permissionDenied(config.annotationDir);
    }
    throw error;
  }
}

function formatHistoryChoice(entry: HistoryEntry, index: number): string {
  const date = new Date(entry.timestamp);
  const dateStr = `[${DateFormats.LOCAL_DATETIME(date)}]`;
  const title = entry.title || 'Untitled';
  const firstLine = entry.finalPrompt.split('\n')[0];
  const truncated = firstLine.length > 50 
    ? firstLine.substring(0, 47) + '...'
    : firstLine;
  
  return `${index}. ${dateStr} ${title} - ${truncated}`;
}