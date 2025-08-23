#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'node:path';
import yaml from 'js-yaml';
import { glob } from 'glob';
import { logger } from '../utils/logger.js';
import { AnnotationMetadata } from '../types/annotations.js';

interface MigrationResult {
  success: string[];
  failed: string[];
  skipped: string[];
}

async function parseMarkdownAnnotation(content: string): Promise<AnnotationMetadata> {
  // Extract YAML frontmatter and notes
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!frontmatterMatch) {
    throw new Error('No frontmatter found in annotation file');
  }

  const yamlContent = frontmatterMatch[1];
  const metadata = yaml.load(yamlContent) as AnnotationMetadata;

  // Extract notes section
  const notesMatch = content.match(/## Notes\n\n([\s\S]*?)$/);
  const notes = notesMatch ? notesMatch[1].trim() : '';

  return {
    ...metadata,
    notes
  };
}

async function migrateAnnotation(mdPath: string): Promise<void> {
  const content = await fs.readFile(mdPath, 'utf-8');
  const annotationData = await parseMarkdownAnnotation(content);
  
  // Create new JSON filename (replace .md with .json)
  const jsonPath = mdPath.replace(/\.md$/, '.json');
  
  // Write JSON file
  await fs.writeJson(jsonPath, annotationData, { spaces: 2 });
  
  // Remove old markdown file
  await fs.remove(mdPath);
}

async function migrateAllAnnotations(annotationDir: string): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: [],
    failed: [],
    skipped: []
  };

  try {
    // Find all .md annotation files
    const pattern = path.join(annotationDir, '**/*-annotation-*.md');
    const mdFiles = await glob(pattern);

    if (mdFiles.length === 0) {
      logger.log('No markdown annotation files found to migrate.');
      return result;
    }

    logger.log(`Found ${mdFiles.length} annotation files to migrate...`);

    for (const mdFile of mdFiles) {
      try {
        // Check if JSON already exists
        const jsonFile = mdFile.replace(/\.md$/, '.json');
        if (await fs.pathExists(jsonFile)) {
          logger.warn(`Skipping ${path.basename(mdFile)} - JSON file already exists`);
          result.skipped.push(mdFile);
          continue;
        }

        await migrateAnnotation(mdFile);
        result.success.push(mdFile);
        logger.log(`✓ Migrated ${path.basename(mdFile)} to JSON`);
      } catch (error) {
        result.failed.push(mdFile);
        logger.error(`✗ Failed to migrate ${path.basename(mdFile)}: ${error}`);
      }
    }

    return result;
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    logger.error('Usage: migrate-annotations <annotation-directory>');
    process.exit(1);
  }

  const annotationDir = args[0];
  
  if (!await fs.pathExists(annotationDir)) {
    logger.error(`Annotation directory not found: ${annotationDir}`);
    process.exit(1);
  }

  try {
    const result = await migrateAllAnnotations(annotationDir);
    
    logger.log('\nMigration Summary:');
    logger.log(`✓ Successfully migrated: ${result.success.length} files`);
    logger.log(`⚠ Skipped: ${result.skipped.length} files`);
    logger.log(`✗ Failed: ${result.failed.length} files`);
    
    if (result.failed.length > 0) {
      logger.log('\nFailed files:');
      result.failed.forEach(file => logger.log(`  - ${path.basename(file)}`));
      process.exit(1);
    }
    
    process.exit(0);
  } catch (error) {
    logger.error('Migration error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { migrateAllAnnotations, parseMarkdownAnnotation };