import chalk from 'chalk';
import fs from 'fs-extra';
import { PuptService } from './pupt-service.js';
import { collectInputs } from './input-collector.js';
import { InteractiveSearch } from '../ui/interactive-search.js';
import { errors } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import type { EnvironmentConfig } from '../types/config.js';

export interface ResolvedPrompt {
  text: string;
  templateInfo: {
    templatePath: string;
    templateContent: string;
    variables: Map<string, unknown>;
    finalPrompt: string;
    title?: string;
    summary?: string;
    reviewFiles?: Array<{ name: string; value: unknown }>;
    timestamp?: Date;
  };
}

export interface ResolvePromptOptions {
  promptDirs: string[];
  libraries?: string[];
  promptName?: string;
  noInteractive?: boolean;
  startTimestamp?: Date;
  /** Environment configuration for prompt rendering */
  environment?: EnvironmentConfig;
}

/**
 * Discover, select, collect inputs, and render a prompt.
 * Shared by both the default `pt` action and `pt run`.
 */
export async function resolvePrompt(options: ResolvePromptOptions): Promise<ResolvedPrompt> {
  const { promptDirs, libraries, promptName, noInteractive, startTimestamp, environment } = options;

  // Ensure prompt directories exist
  for (const dir of promptDirs) {
    await fs.ensureDir(dir);
  }

  // Discover prompts with environment config
  const puptService = new PuptService({ promptDirs, libraries, environment });
  await puptService.init();

  let selected;

  if (promptName) {
    // Find specific prompt by name
    const jsxPrompt = puptService.findPrompt(promptName);
    const adapted = jsxPrompt
      ? puptService.getPromptsAsAdapted().find(p => p._source === jsxPrompt)
      : undefined;
    if (!adapted) {
      throw errors.promptNotFound(promptName);
    }
    selected = adapted;
    logger.log(chalk.blue(`\nUsing prompt: ${selected.title}`));
    logger.log(chalk.dim(`Location: ${selected.path}\n`));
  } else {
    // Interactive search
    const prompts = puptService.getPromptsAsAdapted();

    if (prompts.length === 0) {
      throw errors.noPromptsFound(promptDirs);
    }

    const search = new InteractiveSearch();
    selected = await search.selectPrompt(prompts);

    logger.log(chalk.blue(`\nProcessing: ${selected.title}`));
    logger.log(chalk.dim(`Location: ${selected.path}\n`));
  }

  // Collect inputs and render
  const dp = selected._source!;
  const inputs = await collectInputs(dp.getInputIterator(), noInteractive);
  const renderResult = await dp.render({ inputs });
  const text = renderResult.text;

  const reviewFiles = renderResult.postExecution
    ?.filter((a: { type: string }) => a.type === 'reviewFile')
    .map((a: { type: string; path?: string; name?: string }) => ({
      name: a.name || a.path || '',
      value: a.path || '',
    }));

  return {
    text,
    templateInfo: {
      templatePath: selected.path,
      templateContent: selected.content,
      variables: inputs,
      finalPrompt: text,
      title: selected.title,
      summary: selected.summary,
      reviewFiles,
      timestamp: startTimestamp,
    },
  };
}
