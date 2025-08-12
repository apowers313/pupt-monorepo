import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

describe('pt CLI E2E', () => {
  const testDir = path.join(os.tmpdir(), 'pt-e2e-test');
  const promptsDir = path.join(testDir, 'prompts');
  const cliPath = path.join(__dirname, '../../dist/cli.js');
  
  beforeEach(async () => {
    await fs.ensureDir(promptsDir);
    process.chdir(testDir);
    
    // Create test config
    await fs.writeJson('.ptrc.json', {
      promptDirs: ['./prompts']
    });
    
    // Create test prompt
    const promptContent = `---
title: Test Prompt
labels: [test]
---
Hello {{input "name" "Your name?"}}!
Today is {{date}}.`;
    
    await fs.writeFile(path.join(promptsDir, 'test.md'), promptContent);
    
    // Build the project
    execSync('npm run build', { 
      stdio: 'ignore',
      cwd: path.join(__dirname, '../..')
    });
  });
  
  afterEach(async () => {
    await fs.remove(testDir);
  });
  
  it('should run pt example command', () => {
    const output = execSync(`node ${cliPath} example`, {
      cwd: testDir,
      encoding: 'utf-8'
    });
    
    expect(output).toContain('Created example prompt');
    expect(fs.existsSync(path.join(testDir, 'prompts/example-api-client.md'))).toBe(true);
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