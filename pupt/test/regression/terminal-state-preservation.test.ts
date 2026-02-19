import { exec,spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import fs from 'fs-extra';
import { afterEach,beforeEach, describe, expect, it } from 'vitest';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_PATH = path.join(__dirname, '../../dist/cli.js');

describe('Terminal State Preservation Tests', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create temp directory
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pt-terminal-test-'));
    
    // Create config
    await fs.writeJson(path.join(tempDir, '.pt-config.json'), {
      promptDirs: [path.join(tempDir, 'prompts')],
      historyDir: path.join(tempDir, 'history'),
      outputCapture: { enabled: false }
    });
    
    // Create test data
    const historyDir = path.join(tempDir, 'history');
    await fs.ensureDir(historyDir);
    
    // Create a history entry with output
    const historyEntry = {
      timestamp: new Date().toISOString(),
      templatePath: '/test/prompt.md',
      templateContent: 'Test prompt content',
      variables: { test: 'value' },
      finalPrompt: 'This is a long test prompt that will generate multiple lines of output when displayed',
      title: 'Test Entry',
      execution: {
        output_file: '20240101-120000-test1234-output.txt',
        exit_code: 0
      }
    };
    
    await fs.writeJson(path.join(historyDir, '20240101-120000-test1234.json'), historyEntry);
    await fs.writeFile(
      path.join(historyDir, '20240101-120000-test1234-output.txt'),
      'This is the output from the command execution.\nIt has multiple lines.\nAnd should display correctly.'
    );
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it.skipIf(!process.stdin.isTTY || process.env.CI)('should not affect terminal when output is piped to less', async () => {

    // Create a script that checks terminal state
    const testScript = `
#!/bin/bash
cd "${tempDir}"

# Function to check if terminal is in raw mode
check_terminal() {
  if stty -a 2>/dev/null | grep -q "[-]icanon.*[-]echo"; then
    echo "TERMINAL_RAW"
  else
    echo "TERMINAL_NORMAL"
  fi
}

# Check initial state
initial_state=$(check_terminal)
echo "Initial state: $initial_state"

# Run the command with less
timeout 2s node "${CLI_PATH}" history --result 1 | head -20

# Check state after command
final_state=$(check_terminal)
echo "Final state: $final_state"

# Verify terminal is still normal
if [ "$initial_state" = "$final_state" ] && [ "$final_state" = "TERMINAL_NORMAL" ]; then
  echo "TEST_PASSED"
else
  echo "TEST_FAILED"
fi
`;

    const scriptPath = path.join(tempDir, 'test-terminal.sh');
    await fs.writeFile(scriptPath, testScript);
    await fs.chmod(scriptPath, '755');

    const { stdout, stderr } = await execAsync(scriptPath);
    
    expect(stdout).toContain('TEST_PASSED');
    expect(stderr).not.toContain('Error');
  });

  it.skipIf(process.platform === 'win32' || process.env.CI === 'true')('should handle SIGPIPE gracefully without terminal corruption', async () => {
    await new Promise<void>((resolve, reject) => {
      // Use 'yes' to generate infinite output and pipe to 'head' which will close early
      const proc = spawn('sh', ['-c', `node "${CLI_PATH}" history --limit 100 | head -1`], {
        cwd: tempDir,
        env: { ...process.env }
      });

      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', (data) => { stdout += data; });
      proc.stderr.on('data', (data) => { stderr += data; });

      proc.on('close', (code) => {
        // Should complete successfully
        expect(code).toBe(0);
        // Should not have EPIPE errors in stderr
        expect(stderr).not.toContain('EPIPE');
        expect(stderr).not.toContain('Unhandled');
        // Should have some output
        expect(stdout.length).toBeGreaterThan(0);
        resolve();
      });

      proc.on('error', reject);
    });
  });

  it('should not use raw mode for read-only commands', { timeout: 15000 }, async () => {
    const commands = [
      ['history'],
      ['history', '--limit', '5'],
      ['history', '1'],
      ['history', '--result', '1'],
      ['help'],
      ['review']
    ];

    for (const args of commands) {
      await new Promise<void>((resolve, reject) => {
        const proc = spawn('node', [CLI_PATH, ...args], {
          cwd: tempDir,
          env: { ...process.env, NODE_ENV: 'test' },
          stdio: ['ignore', 'pipe', 'pipe']
        });

        // Monitor for any raw mode indicators
        let hasRawModeError = false;

        proc.stderr.on('data', (data) => {
          const output = data.toString();
          if (output.includes('setRawMode') || output.includes('raw mode')) {
            hasRawModeError = true;
          }
        });

        proc.on('close', () => {
          expect(hasRawModeError).toBe(false);
          resolve();
        });

        proc.on('error', reject);
      });
    }
  });

  it('should preserve terminal state even with complex output', async () => {
    // Create a large history entry with special characters
    const largeEntry = {
      timestamp: new Date().toISOString(),
      templatePath: '/test/large.md',
      templateContent: 'Large test',
      variables: {
        data: 'Special chars: \x1b[31mred\x1b[0m \n\r\t'
      },
      finalPrompt: Array(100).fill('This is a line of output.').join('\n'),
      title: 'Large Entry'
    };
    
    await fs.writeJson(
      path.join(tempDir, 'history', '20240102-120000-large5678.json'),
      largeEntry
    );

    await new Promise<void>((resolve, reject) => {
      const proc = spawn('sh', ['-c', `node "${CLI_PATH}" history 2 | tail -10`], {
        cwd: tempDir,
        env: { ...process.env }
      });

      let stderr = '';
      proc.stderr.on('data', (data) => { stderr += data; });

      proc.on('close', (code) => {
        expect(code).toBe(0);
        expect(stderr).not.toContain('EPIPE');
        expect(stderr).not.toContain('Error');
        resolve();
      });

      proc.on('error', reject);
    });
  });
});