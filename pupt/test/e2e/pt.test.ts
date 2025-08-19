import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

describe('pt CLI E2E', () => {
  const testDir = path.join(os.tmpdir(), 'pt-e2e-test');
  const promptsDir = path.join(testDir, '.prompts');
  const cliPath = path.join(__dirname, '../../dist/cli.js');
  
  beforeEach(async () => {
    await fs.ensureDir(promptsDir);
    process.chdir(testDir);
    
    // Create test config
    await fs.writeJson('.pt-config.json', {
      promptDirs: ['./.prompts']
    });
    
    // Create test prompt
    const promptContent = `---
title: Test Prompt
labels: [test]
---
Hello {{input "name" "Your name?"}}!
Today is {{date}}.`;
    
    await fs.writeFile(path.join(promptsDir, 'test.md'), promptContent);
  });
  
  afterEach(async () => {
    // On Windows, files might still be in use, so retry removal
    const maxRetries = 3;
    for (let i = 0; i < maxRetries; i++) {
      try {
        await fs.remove(testDir);
        break;
      } catch (error: any) {
        if (error.code === 'EBUSY' && i < maxRetries - 1) {
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 100));
        } else {
          // Ignore the error on the last attempt - CI will clean up temp files
          if (error.code !== 'EBUSY') throw error;
        }
      }
    }
  });
  
  it('should run pt example command', () => {
    const output = execSync(`node ${cliPath} example`, {
      cwd: testDir,
      encoding: 'utf-8'
    });
    
    expect(output).toContain('Created example prompt');
    expect(fs.existsSync(path.join(testDir, '.prompts/example-api-client.md'))).toBe(true);
  });
  
  it('should display help', () => {
    const output = execSync(`node ${cliPath} --help`, {
      cwd: testDir,
      encoding: 'utf-8'
    });
    
    expect(output).toContain('Usage:');
    expect(output).toContain('Commands:');
  });
  
  it('should display version', () => {
    const output = execSync(`node ${cliPath} --version`, {
      cwd: testDir,
      encoding: 'utf-8'
    });
    
    expect(output).toMatch(/\d+\.\d+\.\d+/);
  });
});