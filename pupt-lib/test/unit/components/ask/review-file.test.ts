import { describe, it, expect } from 'vitest';
import { AskReviewFile } from '../../../../src/components/ask/ReviewFile';
import { createRenderContext } from '../../../setup';

describe('Ask.ReviewFile', () => {
  it('should render with placeholder when no value provided', () => {
    const component = new AskReviewFile();
    const context = createRenderContext();

    const result = component.render({
      name: 'outputFile',
      label: 'Output file',
    }, undefined, context);

    expect(result).toBe('{outputFile}');
  });

  it('should render with default value when no input value', () => {
    const component = new AskReviewFile();
    const context = createRenderContext();

    const result = component.render({
      name: 'outputFile',
      label: 'Output file',
      default: './default-output.txt',
    }, undefined, context);

    expect(result).toBe('./default-output.txt');
  });

  it('should render with input value when provided', () => {
    const component = new AskReviewFile();
    const context = createRenderContext();
    context.inputs.set('outputFile', './custom-output.txt');

    const result = component.render({
      name: 'outputFile',
      label: 'Output file',
      default: './default-output.txt',
    }, undefined, context);

    expect(result).toBe('./custom-output.txt');
  });

  it('should add post-execution reviewFile action with input value', () => {
    const component = new AskReviewFile();
    const context = createRenderContext();
    context.inputs.set('outputFile', './my-output.ts');

    component.render({
      name: 'outputFile',
      label: 'Output file',
    }, undefined, context);

    expect(context.postExecution).toHaveLength(1);
    expect(context.postExecution[0]).toEqual({
      type: 'reviewFile',
      file: './my-output.ts',
      editor: undefined,
    });
  });

  it('should add post-execution reviewFile action with default value', () => {
    const component = new AskReviewFile();
    const context = createRenderContext();

    component.render({
      name: 'outputFile',
      label: 'Output file',
      default: './default.ts',
    }, undefined, context);

    expect(context.postExecution).toHaveLength(1);
    expect(context.postExecution[0]).toEqual({
      type: 'reviewFile',
      file: './default.ts',
      editor: undefined,
    });
  });

  it('should include editor in post-execution action', () => {
    const component = new AskReviewFile();
    const context = createRenderContext();
    context.inputs.set('outputFile', './output.ts');

    component.render({
      name: 'outputFile',
      label: 'Output file',
      editor: 'vscode',
    }, undefined, context);

    expect(context.postExecution[0]).toEqual({
      type: 'reviewFile',
      file: './output.ts',
      editor: 'vscode',
    });
  });

  it('should not add post-execution action when no value or default', () => {
    const component = new AskReviewFile();
    const context = createRenderContext();

    component.render({
      name: 'outputFile',
      label: 'Output file',
    }, undefined, context);

    expect(context.postExecution).toHaveLength(0);
  });

  it('should attach input requirement to context', () => {
    const component = new AskReviewFile();
    const context = createRenderContext() as ReturnType<typeof createRenderContext> & { __requirements: unknown[] };
    context.__requirements = [];

    component.render({
      name: 'configFile',
      label: 'Config file',
      description: 'Configuration file path',
      required: true,
      default: './config.json',
      extensions: ['.json', '.yaml'],
    }, undefined, context);

    expect(context.__requirements).toHaveLength(1);
    expect(context.__requirements[0]).toMatchObject({
      name: 'configFile',
      label: 'Config file',
      description: 'Configuration file path',
      type: 'file',
      required: true,
      default: './config.json',
      extensions: ['.json', '.yaml'],
      mustExist: false,
    });
  });

  it('should use label as description when not provided', () => {
    const component = new AskReviewFile();
    const context = createRenderContext() as ReturnType<typeof createRenderContext> & { __requirements: unknown[] };
    context.__requirements = [];

    component.render({
      name: 'file',
      label: 'Select a file',
    }, undefined, context);

    expect(context.__requirements).toHaveLength(1);
    expect((context.__requirements[0] as { description: string }).description).toBe('Select a file');
  });

  it('should handle extensions array', () => {
    const component = new AskReviewFile();
    const context = createRenderContext() as ReturnType<typeof createRenderContext> & { __requirements: unknown[] };
    context.__requirements = [];

    component.render({
      name: 'sourceFile',
      label: 'Source file',
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
    }, undefined, context);

    expect(context.__requirements).toHaveLength(1);
    expect((context.__requirements[0] as { extensions: string[] }).extensions).toEqual(['.ts', '.tsx', '.js', '.jsx']);
  });
});
