import { select, input, editor, confirm } from '@inquirer/prompts';
import fs from 'fs-extra';
import path from 'node:path';
import yaml from 'js-yaml';
import { v4 as uuidv4 } from 'uuid';
import { ConfigManager } from '../config/config-manager.js';
import { HistoryManager } from '../history/history-manager.js';
import { HistoryEntry } from '../types/history.js';
import { errors } from '../utils/errors.js';
import { DateFormats } from '../utils/date-formatter.js';
import { logger } from '../utils/logger.js';
import { AnnotationMetadata, StructuredOutcome, IssueIdentified } from '../types/annotations.js';

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

  // Enhanced annotation features for non-success statuses
  if (status !== 'success') {
    const addStructuredData = await select({
      message: 'Add structured outcome data?',
      choices: [
        { value: true, name: 'Yes - Add task/test metrics' },
        { value: false, name: 'No - Skip structured data' }
      ]
    });

    if (addStructuredData) {
      metadata.structured_outcome = await collectStructuredOutcome();
    }

    const addIssues = await select({
      message: 'Identify specific issues?',
      choices: [
        { value: true, name: 'Yes - Categorize issues found' },
        { value: false, name: 'No - Skip issue identification' }
      ]
    });

    if (addIssues) {
      metadata.issues_identified = await collectIssues();
    }
  }

  const content = `---
${yaml.dump(metadata)}---

## Notes

${notes}
`;

  const historyBasename = path.basename(entry.filename, '.json');
  const filename = `${historyBasename}-annotation-${uuidv4()}.md`;
  const filepath = path.join(config.annotationDir, filename);
  
  try {
    await fs.writeFile(filepath, content);
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

async function collectStructuredOutcome(): Promise<StructuredOutcome> {
  const tasksCompleted = await input({
    message: 'Tasks completed:',
    validate: (value) => {
      const num = parseInt(value);
      return !isNaN(num) && num >= 0 ? true : 'Please enter a valid number';
    }
  });

  const tasksTotal = await input({
    message: 'Total tasks:',
    validate: (value) => {
      const num = parseInt(value);
      return !isNaN(num) && num >= parseInt(tasksCompleted) ? true : 'Total must be >= completed';
    }
  });

  const testsRun = await input({
    message: 'Tests run:',
    validate: (value) => {
      const num = parseInt(value);
      return !isNaN(num) && num >= 0 ? true : 'Please enter a valid number';
    }
  });

  const testsPassed = await input({
    message: 'Tests passed:',
    validate: (value) => {
      const num = parseInt(value);
      return !isNaN(num) && num >= 0 && num <= parseInt(testsRun) ? true : 'Must be <= tests run';
    }
  });

  const testsFailed = await input({
    message: 'Tests failed:',
    validate: (value) => {
      const num = parseInt(value);
      const passed = parseInt(testsPassed);
      const run = parseInt(testsRun);
      return !isNaN(num) && num >= 0 && (passed + num) <= run ? true : 'Invalid test count';
    }
  });

  const executionTime = await input({
    message: 'Execution time (e.g., 2m30s):',
    default: '0s'
  });

  const verificationPassed = await confirm({
    message: 'Did verification pass?',
    default: false
  });

  return {
    tasks_completed: parseInt(tasksCompleted),
    tasks_total: parseInt(tasksTotal),
    tests_run: parseInt(testsRun),
    tests_passed: parseInt(testsPassed),
    tests_failed: parseInt(testsFailed),
    verification_passed: verificationPassed,
    execution_time: executionTime
  };
}

async function collectIssues(): Promise<IssueIdentified[]> {
  const issues: IssueIdentified[] = [];
  let addMore = true;

  while (addMore) {
    const category = await select({
      message: 'Issue category:',
      choices: [
        { value: 'verification_gap', name: 'Verification Gap - AI claimed success but verification failed' },
        { value: 'incomplete_task', name: 'Incomplete Task - Stopped before completing all work' },
        { value: 'ambiguous_instruction', name: 'Ambiguous Instruction - Unclear requirements' },
        { value: 'missing_constraint', name: 'Missing Constraint - Important requirement not specified' }
      ]
    }) as IssueIdentified['category'];

    const severity = await select({
      message: 'Issue severity:',
      choices: [
        { value: 'low', name: 'Low - Minor inconvenience' },
        { value: 'medium', name: 'Medium - Noticeable impact' },
        { value: 'high', name: 'High - Significant problem' },
        { value: 'critical', name: 'Critical - Complete failure' }
      ]
    }) as IssueIdentified['severity'];

    const description = await input({
      message: 'Brief description:',
      validate: (value) => value.trim().length > 0 ? true : 'Description required'
    });

    const evidence = await editor({
      message: 'Evidence/details (press enter to open editor):'
    });

    issues.push({
      category,
      severity,
      description: description.trim(),
      evidence: evidence.trim()
    });

    addMore = await confirm({
      message: 'Add another issue?',
      default: false
    });
  }

  return issues;
}