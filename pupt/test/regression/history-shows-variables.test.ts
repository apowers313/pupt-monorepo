/**
 * Regression test: History output should show variables/parameters passed to prompts
 *
 * Previously, the history command would show the prompt description instead of
 * the actual variables users passed in. Users want to see what parameters they
 * used, not the prompt's static description.
 *
 * Example of correct output:
 *   420. [2026-01-26 15:31] Ad Hoc
 *      prompt: "does design/pupt-lib-refactor-plan.md have enough details..."
 *
 * Example of incorrect output:
 *   420. [2026-01-26 15:31] Ad Hoc
 *      Ad Hoc Prompt Description
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import { HistoryManager } from '../../src/history/history-manager.js';

// Re-implement createAutoSummary logic for testing (mirrors history.ts)
function formatVariables(variables: Record<string, unknown>): string[] {
  const formatted: string[] = [];

  const entries = Object.entries(variables).filter(([_, value]) =>
    value !== '***' && value !== undefined && value !== null && value !== ''
  );

  for (const [key, value] of entries) {
    if (typeof value === 'string') {
      const normalized = value
        .replace(/\n+/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();

      const isFileVariable = key.toLowerCase().includes('file') ||
        key.toLowerCase().includes('path') ||
        key.toLowerCase().includes('dir');

      if (isFileVariable && (normalized.includes('/') || normalized.includes('\\'))) {
        const filename = normalized.split(/[/\\]/).pop() || normalized;
        formatted.push(`${key}: "${filename}"`);
      } else {
        const escaped = normalized.replace(/"/g, '\\"');
        formatted.push(`${key}: "${escaped}"`);
      }
    } else if (typeof value === 'boolean') {
      formatted.push(`${key}: ${value}`);
    } else if (typeof value === 'number') {
      formatted.push(`${key}: ${value}`);
    } else if (Array.isArray(value)) {
      formatted.push(`${key}: [${value.length} items]`);
    } else if (typeof value === 'object') {
      formatted.push(`${key}: {...}`);
    } else {
      formatted.push(`${key}: ${String(value)}`);
    }
  }

  return formatted;
}

function createAutoSummary(entry: { summary?: string; variables: Record<string, unknown>; finalPrompt: string }): string {
  const maxSummaryLength = 77;

  let summary: string;

  // First, try to show the most relevant user inputs (variables)
  const varDisplay = formatVariables(entry.variables);

  if (varDisplay.length > 0) {
    summary = varDisplay.slice(0, 2).join(', ');
  } else if (entry.summary) {
    summary = entry.summary;
  } else {
    summary = entry.finalPrompt.split('\n')[0].trim();
  }

  if (summary.length > maxSummaryLength) {
    return summary.substring(0, maxSummaryLength - 3) + '...';
  }
  return summary;
}

describe('History shows variables regression', () => {
  let tempDir: string;
  let historyManager: HistoryManager;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pt-history-vars-'));
    historyManager = new HistoryManager(tempDir);
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('should show variables in history summary, not prompt description', () => {
    const entry = {
      summary: 'This is the prompt description',
      variables: {
        prompt: 'What is the meaning of life?',
        model: 'claude-3'
      },
      finalPrompt: 'Rendered prompt content here'
    };

    const summary = createAutoSummary(entry);

    // Should show variables, not the description
    expect(summary).toContain('prompt:');
    expect(summary).toContain('What is the meaning of life?');
    expect(summary).not.toBe('This is the prompt description');
  });

  it('should fall back to summary when no variables exist', () => {
    const entry = {
      summary: 'This is the prompt description',
      variables: {},
      finalPrompt: 'Rendered prompt content here'
    };

    const summary = createAutoSummary(entry);

    // Should show the summary since there are no variables
    expect(summary).toBe('This is the prompt description');
  });

  it('should fall back to finalPrompt when no variables or summary', () => {
    const entry = {
      variables: {},
      finalPrompt: 'First line of prompt\nSecond line'
    };

    const summary = createAutoSummary(entry);

    // Should show the first line of the prompt
    expect(summary).toBe('First line of prompt');
  });

  it('should skip masked/empty variables', () => {
    const entry = {
      summary: 'Prompt description',
      variables: {
        apiKey: '***',
        empty: '',
        nullVal: null,
        prompt: 'Actual user input'
      },
      finalPrompt: 'Rendered prompt'
    };

    const summary = createAutoSummary(entry);

    // Should only show the non-masked, non-empty variable
    expect(summary).toContain('prompt:');
    expect(summary).toContain('Actual user input');
    expect(summary).not.toContain('apiKey');
    expect(summary).not.toContain('***');
  });

  it('should truncate long variable values', () => {
    const longValue = 'A'.repeat(100);
    const entry = {
      summary: 'Description',
      variables: {
        prompt: longValue
      },
      finalPrompt: 'Prompt'
    };

    const summary = createAutoSummary(entry);

    // Should be truncated to fit within maxSummaryLength (77 chars)
    expect(summary.length).toBeLessThanOrEqual(77);
    expect(summary).toContain('...');
  });

  it('should show up to 2 variables', () => {
    const entry = {
      summary: 'Description',
      variables: {
        first: 'value1',
        second: 'value2',
        third: 'value3'
      },
      finalPrompt: 'Prompt'
    };

    const summary = createAutoSummary(entry);

    // Should show first two variables
    expect(summary).toContain('first:');
    expect(summary).toContain('second:');
    // Third variable should not be shown (only show up to 2)
    expect(summary).not.toContain('third:');
  });

  it('should handle file path variables specially', () => {
    const entry = {
      variables: {
        filePath: '/home/user/documents/my-file.txt'
      },
      finalPrompt: 'Prompt'
    };

    const summary = createAutoSummary(entry);

    // Should show just the filename, not the full path
    expect(summary).toContain('filePath:');
    expect(summary).toContain('my-file.txt');
    expect(summary).not.toContain('/home/user/documents');
  });

  it('should preserve variables with real history entries', async () => {
    // Save a history entry with variables (HistoryManager expects a Map)
    const variables = new Map<string, unknown>();
    variables.set('prompt', 'What is TypeScript?');
    variables.set('format', 'markdown');

    await historyManager.savePrompt({
      templatePath: 'ad-hoc.prompt',
      templateContent: 'Template content',
      variables,
      finalPrompt: 'Rendered: What is TypeScript?',
      title: 'Ad Hoc',
      timestamp: new Date()
    });

    // Load it back
    const entries = await historyManager.listHistory(1);
    expect(entries.length).toBe(1);

    const entry = entries[0];
    expect(entry.variables).toHaveProperty('prompt', 'What is TypeScript?');
    expect(entry.variables).toHaveProperty('format', 'markdown');

    // Create summary from loaded entry
    const summary = createAutoSummary({
      summary: entry.summary,
      variables: entry.variables,
      finalPrompt: entry.finalPrompt
    });

    // Should show the variables
    expect(summary).toContain('prompt:');
    expect(summary).toContain('What is TypeScript?');
  });
});
