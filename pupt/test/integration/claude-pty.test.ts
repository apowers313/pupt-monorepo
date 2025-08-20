import * as pty from 'node-pty';
import { describe, it, expect } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import stripAnsi from 'strip-ansi';

describe('Claude PTY Input Test', () => {
  it('should pass input to claude through PTY', async () => {
    const testPrompt = 'What is 2+2';
    const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'claude-pty-test-'));
    const outputFile = path.join(outputDir, 'output.txt');
    
    let promptSent = false;
    let responseReceived = false;
    
    await new Promise<void>((resolve) => {
      const output: string[] = [];
      
      // Create PTY process
      const ptyProcess = pty.spawn('claude', [], {
        name: 'xterm-256color',
        cols: 80,
        rows: 30,
        cwd: process.cwd(),
        env: process.env as Record<string, string>
      });
      
      console.log('PTY process spawned');
      
      // Buffer to accumulate output for better detection
      let fullOutput = '';
      
      ptyProcess.onData((data) => {
        output.push(data);
        const cleanData = stripAnsi(data);
        fullOutput += cleanData;
        
        console.log('PTY DATA:', JSON.stringify(data));
        console.log('CLEAN DATA:', cleanData);
        
        // Send prompt when we see the prompt indicator '>'
        if (!promptSent && cleanData.includes('>') && fullOutput.includes('? for shortcuts')) {
          console.log('Claude is ready, sending prompt...');
          promptSent = true;
          
          // Send the prompt immediately
          setTimeout(() => {
            console.log('Writing prompt:', testPrompt);
            ptyProcess.write(testPrompt);
            ptyProcess.write('\r');
          }, 500);
        }
        
        // Check if we see Claude's response (looking for '4' after our prompt was sent)
        if (promptSent && !responseReceived && cleanData.includes('4')) {
          console.log('SAW CLAUDE RESPONSE WITH "4"!');
          responseReceived = true;
          // Kill the process once we get the response
          setTimeout(() => ptyProcess.kill(), 1000);
        }
      });
      
      ptyProcess.onExit(async ({ exitCode }) => {
        console.log('PTY process exited with code:', exitCode);
        const fullOutput = output.join('');
        const cleanOutput = stripAnsi(fullOutput);
        await fs.writeFile(outputFile, cleanOutput);
        console.log('Output saved to:', outputFile);
        console.log('Output includes "4":', cleanOutput.includes('4'));
        resolve();
      });
      
      // Set a timeout to ensure test doesn't hang
      setTimeout(() => {
        console.log('Test timeout - killing process');
        ptyProcess.kill();
      }, 20000);
    });
    
    // Check output
    const outputContent = await fs.readFile(outputFile, 'utf-8');
    console.log('Captured output length:', outputContent.length);
    console.log('Full output:\n', outputContent);
    
    // Check if we actually got a response
    console.log('Response received:', responseReceived);
    console.log('Prompt was sent:', promptSent);
    
    // Look for our prompt in the output
    const promptIndex = outputContent.indexOf(testPrompt);
    console.log('Found prompt at position:', promptIndex);
    
    if (promptIndex > 0) {
      const afterPrompt = outputContent.substring(promptIndex + testPrompt.length);
      console.log('Content after prompt:', afterPrompt.substring(0, 200));
    }
    
    // Clean up
    await fs.remove(outputDir);
  }, 30000);
});