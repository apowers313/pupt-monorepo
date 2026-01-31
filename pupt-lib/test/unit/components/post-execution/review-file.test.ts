import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/render';
import { jsx } from '../../../../src/jsx-runtime';
import { PostExecution, ReviewFile, OpenUrl, RunCommand } from '../../../../src/components/post-execution';

describe('PostExecution', () => {
  it('should collect post-execution actions', async () => {
    const element = jsx(PostExecution, {
      children: [
        jsx(ReviewFile, { file: './output.ts' }),
        jsx(OpenUrl, { url: 'https://docs.example.com' }),
      ],
    });

    const result = await render(element);

    expect(result.postExecution).toHaveLength(2);
    expect(result.postExecution[0]).toEqual({
      type: 'reviewFile',
      file: './output.ts',
    });
    expect(result.postExecution[1]).toEqual({
      type: 'openUrl',
      url: 'https://docs.example.com',
    });
  });

  it('should collect all types of post-execution actions', async () => {
    const element = jsx(PostExecution, {
      children: [
        jsx(ReviewFile, { file: './output.ts' }),
        jsx(OpenUrl, { url: 'https://docs.example.com' }),
        jsx(RunCommand, { command: 'npm test' }),
      ],
    });

    const result = await render(element);

    expect(result.postExecution).toHaveLength(3);
  });
});

describe('ReviewFile', () => {
  it('should add reviewFile action', async () => {
    const element = jsx(ReviewFile, {
      file: './generated.ts',
      editor: 'vscode',
    });

    const result = await render(element);

    expect(result.postExecution[0]).toEqual({
      type: 'reviewFile',
      file: './generated.ts',
      editor: 'vscode',
    });
  });

  it('should add reviewFile action without editor', async () => {
    const element = jsx(ReviewFile, {
      file: './output.js',
    });

    const result = await render(element);

    expect(result.postExecution[0]).toEqual({
      type: 'reviewFile',
      file: './output.js',
    });
    expect(result.postExecution[0]).not.toHaveProperty('editor');
  });
});

describe('OpenUrl', () => {
  it('should add openUrl action with browser', async () => {
    const element = jsx(OpenUrl, {
      url: 'https://example.com',
      browser: 'chrome',
    });

    const result = await render(element);

    expect(result.postExecution[0]).toEqual({
      type: 'openUrl',
      url: 'https://example.com',
      browser: 'chrome',
    });
  });

  it('should add openUrl action without browser', async () => {
    const element = jsx(OpenUrl, {
      url: 'https://example.com',
    });

    const result = await render(element);

    expect(result.postExecution[0]).toEqual({
      type: 'openUrl',
      url: 'https://example.com',
    });
    expect(result.postExecution[0]).not.toHaveProperty('browser');
  });
});

describe('RunCommand', () => {
  it('should add runCommand action with cwd', async () => {
    const element = jsx(RunCommand, {
      command: 'npm test',
      cwd: './project',
    });

    const result = await render(element);

    expect(result.postExecution[0]).toEqual({
      type: 'runCommand',
      command: 'npm test',
      cwd: './project',
    });
  });

  it('should add runCommand action without cwd', async () => {
    const element = jsx(RunCommand, {
      command: 'npm run build',
    });

    const result = await render(element);

    expect(result.postExecution[0]).toEqual({
      type: 'runCommand',
      command: 'npm run build',
    });
    expect(result.postExecution[0]).not.toHaveProperty('cwd');
  });

  it('should add runCommand action with env', async () => {
    const element = jsx(RunCommand, {
      command: 'npm test',
      env: { NODE_ENV: 'test', DEBUG: 'true' },
    });

    const result = await render(element);

    expect(result.postExecution[0]).toEqual({
      type: 'runCommand',
      command: 'npm test',
      env: { NODE_ENV: 'test', DEBUG: 'true' },
    });
  });

  it('should add runCommand action with all options', async () => {
    const element = jsx(RunCommand, {
      command: 'npm run test:ci',
      cwd: './packages/core',
      env: { CI: 'true' },
    });

    const result = await render(element);

    expect(result.postExecution[0]).toEqual({
      type: 'runCommand',
      command: 'npm run test:ci',
      cwd: './packages/core',
      env: { CI: 'true' },
    });
  });
});
