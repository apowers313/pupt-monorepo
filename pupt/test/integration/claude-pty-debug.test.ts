import * as pty from '@homebridge/node-pty-prebuilt-multiarch';
import { afterAll,beforeAll, describe, it } from 'vitest';

import { setupClaudeMock } from '../helpers/claude-mock-helper.js';

describe('Claude PTY Debug', () => {
  // Skip on Windows CI due to missing PTY binaries
  const skipOnWindowsCI = process.platform === 'win32' && process.env.CI;
  let cleanupMock: () => void;
  
  beforeAll(() => {
    cleanupMock = setupClaudeMock();
  });
  
  afterAll(() => {
    cleanupMock();
  });
  it.skipIf(skipOnWindowsCI)('should show exact output from claude', async () => {
    await new Promise<void>((resolve) => {
      let dataCount = 0;
      let allData = '';
      
      const ptyProcess = pty.spawn('claude', [], {
        name: 'xterm-256color',
        cols: 80,
        rows: 30,
        cwd: process.cwd(),
        env: process.env as Record<string, string>
      });
      
      ptyProcess.onData((data) => {
        dataCount++;
        allData += data;
        console.log(`\n=== DATA CHUNK ${dataCount} ===`);
        console.log('Raw bytes:', Buffer.from(data).toJSON().data);
        console.log('As string:', data);
        
        // Check for prompt indicators
        if (data.includes('>')) {
          console.log('FOUND > character!');
        }
        if (data.includes('│')) {
          console.log('FOUND │ character!');
        }
        if (data.includes('shortcuts')) {
          console.log('FOUND "shortcuts"!');
        }
        
        // After we've seen enough, send input
        if (dataCount === 5) {
          console.log('\n=== SENDING INPUT ===');
          ptyProcess.write('hello claude\r');
        }
      });
      
      // Kill after 5 seconds
      setTimeout(() => {
        console.log('\n=== FULL OUTPUT ===');
        console.log('Total length:', allData.length);
        console.log('Contains "│ >":', allData.includes('│ >'));
        console.log('Contains "shortcuts":', allData.includes('shortcuts'));
        
        // Find the positions
        const pipePos = allData.indexOf('│');
        const gtPos = allData.indexOf('>');
        const shortcutsPos = allData.indexOf('shortcuts');
        
        console.log('Position of │:', pipePos);
        console.log('Position of >:', gtPos);
        console.log('Position of shortcuts:', shortcutsPos);
        
        if (pipePos >= 0 && gtPos >= 0) {
          console.log('Characters between │ and >:', allData.substring(pipePos, gtPos + 1));
        }
        
        ptyProcess.kill();
        resolve();
      }, 5000);
    });
  }, 10000);
});