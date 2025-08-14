import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import path from 'path';

describe('pt init CLI', () => {
  const cliPath = path.join(process.cwd(), 'dist/cli.js');

  it('should show init command in help', () => {
    const output = execSync(`node ${cliPath} --help`, { encoding: 'utf-8' });
    expect(output).toContain('init');
    expect(output).toContain('Initialize a new prompt tool configuration');
  });

  it('should show init command help', () => {
    const output = execSync(`node ${cliPath} init --help`, { encoding: 'utf-8' });
    expect(output).toContain('Initialize a new prompt tool configuration');
  });
});