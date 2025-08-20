import { spawn } from 'child_process';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { setupClaudeMock } from '../helpers/claude-mock-helper.js';

describe('Claude Direct Input Test', () => {
  let cleanupMock: () => void;
  
  beforeAll(() => {
    cleanupMock = setupClaudeMock();
  });
  
  afterAll(() => {
    cleanupMock();
  });
  it('should pass input to claude without PTY', async () => {
    const testPrompt = 'What is 2 + 2? Please respond with just the number.';
    const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'claude-test-'));
    const outputFile = path.join(outputDir, 'output.txt');
    
    await new Promise<void>((resolve) => {
      const claudeProcess = spawn('claude', [], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      const output: string[] = [];
      
      claudeProcess.stdout.on('data', (data) => {
        const text = data.toString();
        output.push(text);
        console.log('STDOUT:', text);
      });
      
      claudeProcess.stderr.on('data', (data) => {
        const text = data.toString();
        console.log('STDERR:', text);
      });
      
      claudeProcess.on('spawn', () => {
        console.log('Process spawned, sending prompt...');
        // Send the prompt immediately
        claudeProcess.stdin.write(testPrompt);
        claudeProcess.stdin.write('\n');
        claudeProcess.stdin.end();
      });
      
      claudeProcess.on('close', async (code) => {
        console.log('Process closed with code:', code);
        const fullOutput = output.join('');
        await fs.writeFile(outputFile, fullOutput);
        console.log('Full output saved to:', outputFile);
        console.log('Output includes "4":', fullOutput.includes('4'));
        resolve();
      });
      
      claudeProcess.on('error', (err) => {
        console.error('Process error:', err);
        resolve();
      });
    });
    
    // Check if output was captured
    const outputContent = await fs.readFile(outputFile, 'utf-8');
    console.log('Captured output length:', outputContent.length);
    console.log('First 500 chars:', outputContent.substring(0, 500));
    
    // Clean up
    await fs.remove(outputDir);
  }, 30000);
});