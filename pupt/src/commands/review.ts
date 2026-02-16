import { ConfigManager } from '../config/config-manager.js';
import { ReviewDataBuilder } from '../services/review-data-builder.js';
import type { ReviewOptions, ReviewData } from '../types/review.js';
import chalk from 'chalk';
import fs from 'fs-extra';
import { logger } from '../utils/logger.js';
import { buildModuleEntries } from '../services/module-entry-builder.js';

export async function reviewCommand(
  promptName?: string,
  options: ReviewOptions = {}
): Promise<void> {
  try {
    const config = await ConfigManager.load();
    const modules = await buildModuleEntries({ config });
    const builder = new ReviewDataBuilder({ ...config, modules });

    // Build review data
    const reviewData = await builder.buildReviewData({
      promptName,
      since: options.since,
    });

    // Format and output based on options
    if (options.format === 'json') {
      const output = JSON.stringify(reviewData, null, 2);
      
      if (options.output) {
        await fs.writeFile(options.output, output);
        logger.log(chalk.green(`✓ Review data written to ${options.output}`));
      } else {
        logger.log(output);
      }
    } else {
      // Default to markdown format
      const report = formatMarkdownReport(reviewData);
      
      if (options.output) {
        await fs.writeFile(options.output, report);
        logger.log(chalk.green(`✓ Review report written to ${options.output}`));
      } else {
        logger.log(report);
      }
    }
  } catch (error) {
    logger.error(chalk.red(`Error generating review: ${error instanceof Error ? error.message : String(error)}`));
    if (options.since) {
      logger.error(chalk.yellow('\nHint: Check that the time filter format is correct (e.g., 7d, 24h, 2w)'));
    }
    if (promptName) {
      logger.error(chalk.yellow('\nHint: Verify that the prompt name exists'));
    }
    process.exit(1);
  }
}

function formatMarkdownReport(data: ReviewData): string {
  const lines: string[] = [];
  
  // Header
  lines.push('# Prompt Review Report');
  lines.push(`*Generated: ${new Date().toISOString()}*`);
  lines.push(`*Analysis Period: ${data.metadata.analysis_period}*`);
  lines.push('');
  
  // Summary
  lines.push('## Summary');
  lines.push(`- Total Prompts: ${data.metadata.total_prompts}`);
  lines.push(`- Total Executions: ${data.metadata.total_executions}`);
  lines.push('');
  
  // Data Completeness
  lines.push('## Data Completeness');
  lines.push(`- With Annotations: ${data.metadata.data_completeness.with_annotations}%`);
  lines.push(`- With Output Capture: ${data.metadata.data_completeness.with_output_capture}%`);
  lines.push(`- With Environment Data: ${data.metadata.data_completeness.with_environment_data}%`);
  lines.push('');
  
  // Prompt Details
  lines.push('## Prompt Analysis');
  lines.push('');
  
  // Sort prompts by success rate (ascending) to highlight problematic ones first
  const sortedPrompts = [...data.prompts].sort((a, b) => 
    a.usage_statistics.success_rate - b.usage_statistics.success_rate
  );
  
  for (const prompt of sortedPrompts) {
    lines.push(`### ${prompt.name}`);
    lines.push(`- **Path**: ${prompt.path}`);
    lines.push(`- **Last Modified**: ${formatDate(prompt.last_modified)}`);
    lines.push(`- **Last Used**: ${formatDate(prompt.usage_statistics.last_used)}`);
    lines.push('');
    
    // Usage Statistics
    lines.push('#### Usage Statistics');
    lines.push(`- Total Runs: ${prompt.usage_statistics.total_runs}`);
    lines.push(`- Annotated Runs: ${prompt.usage_statistics.annotated_runs}`);
    lines.push(`- **Success Rate: ${(prompt.usage_statistics.success_rate * 100).toFixed(1)}%**`);
    lines.push(`- Average Duration: ${prompt.usage_statistics.avg_duration}`);
    lines.push('');
    
    // Execution Outcomes
    if (prompt.usage_statistics.annotated_runs > 0) {
      lines.push('#### Execution Outcomes');
      lines.push(`- ${chalk.green('✓ Success')}: ${prompt.execution_outcomes.success}`);
      lines.push(`- ${chalk.yellow('⚠ Partial')}: ${prompt.execution_outcomes.partial}`);
      lines.push(`- ${chalk.red('✗ Failure')}: ${prompt.execution_outcomes.failure}`);
      lines.push('');
    } else {
      lines.push('*No annotations available for this prompt*');
      lines.push('');
    }
    
    // Recent Annotations
    if (prompt.user_annotations.length > 0) {
      lines.push('#### Recent Annotations');
      const recentAnnotations = prompt.user_annotations
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
        .slice(0, 3);
      
      for (const annotation of recentAnnotations) {
        const statusIcon = getStatusIcon(annotation.status);
        lines.push(`- ${formatDate(annotation.timestamp)} - ${statusIcon} ${annotation.status}`);
        if (annotation.notes) {
          const truncatedNotes = annotation.notes.substring(0, 100);
          const notes = annotation.notes.length > 100 ? truncatedNotes + '...' : truncatedNotes;
          lines.push(`  *"${notes}"*`);
        }
      }
      lines.push('');
    }
    
    // Detected Patterns (will be populated in Phase 5)
    if (prompt.detected_patterns.length > 0) {
      lines.push('#### Detected Patterns');
      for (const pattern of prompt.detected_patterns) {
        lines.push(`- **${pattern.pattern_type}** (${pattern.severity}): ${pattern.frequency} occurrences`);
      }
      lines.push('');
    }
    
    lines.push('---');
    lines.push('');
  }
  
  // Cross-Prompt Patterns (will be populated in Phase 5)
  if (data.cross_prompt_patterns.length > 0) {
    lines.push('## Cross-Prompt Patterns');
    for (const pattern of data.cross_prompt_patterns) {
      lines.push(`- **${pattern.pattern}**: Affects ${pattern.affected_prompts.length} prompts`);
      lines.push(`  - Total Occurrences: ${pattern.total_occurrences}`);
      lines.push(`  - Impact: ${pattern.impact_assessment}`);
    }
    lines.push('');
  }
  
  return lines.join('\n');
}

function formatDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  } catch {
    return isoDate;
  }
}

function getStatusIcon(status: string): string {
  switch (status) {
    case 'success':
      return chalk.green('✓');
    case 'partial':
      return chalk.yellow('⚠');
    case 'failure':
      return chalk.red('✗');
    default:
      return '•';
  }
}