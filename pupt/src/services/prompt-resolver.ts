import type { ModuleEntry } from '@pupt/lib';
import chalk from 'chalk';

import type { EnvironmentConfig } from '../types/config.js';
import { InteractiveSearch } from '../ui/interactive-search.js';
import { errors } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { collectInputs } from './input-collector.js';
import { PuptService } from './pupt-service.js';

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
  modules: ModuleEntry[];
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
  const { modules, promptName, noInteractive, startTimestamp, environment } = options;

  // Discover prompts with environment config
  const puptService = new PuptService({ modules, environment });
  await puptService.init();

  // Display any module loading warnings
  for (const warning of puptService.getWarnings()) {
    logger.warn(warning);
  }

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
      throw errors.noPromptsFound([]);
    }

    const search = new InteractiveSearch();
    selected = await search.selectPrompt(prompts);

    logger.log(chalk.blue(`\nProcessing: ${selected.title}`));
    logger.log(chalk.dim(`Location: ${selected.path}\n`));
  }

  // Collect inputs and render (wrap with environment if configured)
  if (!selected._source) {
    throw errors.promptNotFound(promptName ?? 'unknown');
  }
  const dp = puptService.wrapWithEnvironment(selected._source);
  const inputs = await collectInputs(dp.getInputIterator(), noInteractive);
  const renderResult = await dp.render({ inputs });
  const {text} = renderResult;

  const reviewFiles = renderResult.postExecution
    ?.filter((a: { type: string }) => a.type === 'reviewFile')
    .map((a: { type: string; file?: string }) => ({
      name: a.file || '',
      value: a.file || '',
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
