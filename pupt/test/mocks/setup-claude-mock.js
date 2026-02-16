#!/usr/bin/env node

/**
 * Setup script to replace claude command with mock for testing
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const mockPath = join(__dirname, 'claude-mock.js');

// Create a simple wrapper script that can be placed in PATH
const wrapperScript = `#!/usr/bin/env node
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const mockPath = '${mockPath}';
const args = process.argv.slice(2);

const child = spawn(process.execPath, [mockPath, ...args], {
  stdio: 'inherit',
  env: process.env
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
`;

// Create wrapper in temp directory
const wrapperPath = join(__dirname, 'claude');
fs.writeFileSync(wrapperPath, wrapperScript, { mode: 0o755 });

console.log(`Claude mock created at: ${wrapperPath}`);
console.log(`To use in tests, add ${__dirname} to PATH:`);
console.log(`export PATH="${__dirname}:$PATH"`);

// Export helper function for tests
export function setupClaudeMock() {
  process.env.PATH = `${__dirname}:${process.env.PATH}`;
  return () => {
    // Restore PATH
    process.env.PATH = process.env.PATH.replace(`${__dirname}:`, '');
  };
}

// Export the mock path
export const CLAUDE_MOCK_PATH = mockPath;