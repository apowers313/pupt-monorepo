import fs from 'fs-extra';
import path from 'node:path';
import yaml from 'js-yaml';
import { logger } from './logger.js';
import { AnnotationMetadata } from '../types/annotations.js';

interface AnnotationMigrationResult {
  migrated: number;
  skipped: number;
  failed: number;
  errors: string[];
}

/**
 * Parse a markdown annotation file and extract all data
 */
async function parseMarkdownAnnotation(filePath: string): Promise<AnnotationMetadata> {
  const content = await fs.readFile(filePath, 'utf-8');
  
  // Extract YAML frontmatter
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

/**
 * Migrate all markdown annotation files to JSON format in a directory
 */
export async function migrateAnnotationsToJson(annotationDir: string): Promise<AnnotationMigrationResult> {
  const result: AnnotationMigrationResult = {
    migrated: 0,
    skipped: 0,
    failed: 0,
    errors: []
  };

  try {
    // Ensure directory exists
    if (!await fs.pathExists(annotationDir)) {
      logger.debug('Annotation directory does not exist, nothing to migrate');
      return result;
    }

    // Read all files in annotation directory
    const files = await fs.readdir(annotationDir);
    
    // Filter for markdown annotation files
    const mdAnnotationFiles = files.filter(file => 
      file.includes('-annotation-') && file.endsWith('.md')
    );

    if (mdAnnotationFiles.length === 0) {
      logger.debug('No markdown annotation files found to migrate');
      return result;
    }

    logger.debug(`Found ${mdAnnotationFiles.length} markdown annotation files to migrate`);

    // Process each file
    for (const mdFile of mdAnnotationFiles) {
      const mdPath = path.join(annotationDir, mdFile);
      const jsonFile = mdFile.replace(/\.md$/, '.json');
      const jsonPath = path.join(annotationDir, jsonFile);

      try {
        // Skip if JSON already exists
        if (await fs.pathExists(jsonPath)) {
          logger.debug(`Skipping ${mdFile} - JSON version already exists`);
          result.skipped++;
          continue;
        }

        // Parse markdown and convert to JSON
        const annotationData = await parseMarkdownAnnotation(mdPath);
        
        // Write JSON file
        await fs.writeJson(jsonPath, annotationData, { spaces: 2 });
        
        // Remove old markdown file
        await fs.remove(mdPath);
        
        result.migrated++;
        logger.debug(`Migrated ${mdFile} to ${jsonFile}`);
      } catch (error) {
        result.failed++;
        const errorMsg = `Failed to migrate ${mdFile}: ${error}`;
        result.errors.push(errorMsg);
        logger.error(errorMsg);
      }
    }

    if (result.migrated > 0) {
      logger.log(`Migrated ${result.migrated} annotation files from markdown to JSON format`);
    }

    return result;
  } catch (error) {
    logger.error('Annotation migration failed:', error);
    throw error;
  }
}

/**
 * Check if annotation migration is needed
 */
async function _needsAnnotationMigration(annotationDir: string): Promise<boolean> {
  try {
    if (!await fs.pathExists(annotationDir)) {
      return false;
    }

    const files = await fs.readdir(annotationDir);
    return files.some(file => file.includes('-annotation-') && file.endsWith('.md'));
  } catch {
    return false;
  }
}