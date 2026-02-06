import { describe, it, expect } from 'vitest';
import { convertPrompt, type ConversionResult } from '../../src/services/prompt-converter.js';

describe('prompt-converter service', () => {
  describe('convertPrompt', () => {
    it('should convert a simple prompt with input helper', () => {
      const md = [
        '---',
        'title: Ad Hoc',
        'tags: []',
        '---',
        '',
        '**Role & Context**: You are a versatile AI assistant.',
        '',
        '**Objective**: {{input "prompt"}}',
        '',
        '**Constraints**: Stay focused.',
        '',
        '**Success Criteria**: The response addresses the request.',
      ].join('\n');

      const result = convertPrompt(md, 'ad-hoc.md');

      expect(result.promptName).toBe('ad-hoc');
      expect(result.description).toBe('Ad Hoc');
      expect(result.tags).toEqual([]);
      expect(result.askComponents).toHaveLength(1);
      expect(result.askComponents[0].tag).toBe('Ask.Text');
      expect(result.askComponents[0].name).toBe('prompt');
      expect(result.output).toContain('<Prompt name="ad-hoc"');
      expect(result.output).toContain('<Ask.Text name="prompt"');
      expect(result.output).toContain('<Role>');
      expect(result.output).toContain('{inputs.prompt}');
      expect(result.output).toContain('<Constraint>');
      expect(result.output).toContain('<SuccessCriteria>');
      expect(result.output).toContain('</Prompt>');
      expect(result.reviewFileVars).toHaveLength(0);
    });

    it('should convert a prompt with reviewFile helpers and PostExecution', () => {
      const md = [
        '---',
        'title: Code Review',
        'tags: [code]',
        '---',
        '',
        '**Role & Context**: You are a code reviewer.',
        '',
        '**Objective**: Review code. Write review to {{reviewFile "outputFile"}}.',
        '',
        '**Specific Requirements**:',
        '- {{editor "concerns"}}',
        '',
        'Report date: {{date}}',
        '',
        'Write report to {{reviewFile "outputFile"}}.',
      ].join('\n');

      const result = convertPrompt(md, 'code-review.md');

      expect(result.promptName).toBe('code-review');
      expect(result.tags).toEqual(['code']);
      expect(result.askComponents.some(c => c.tag === 'Ask.ReviewFile')).toBe(true);
      expect(result.askComponents.some(c => c.tag === 'Ask.Editor')).toBe(true);
      expect(result.askComponents.filter(c => c.name === 'outputFile')).toHaveLength(1);
      expect(result.reviewFileVars).toContain('outputFile');
      expect(result.output).toContain('<PostExecution>');
      expect(result.output).toContain('<ReviewFile file={inputs.outputFile} />');
      expect(result.output).toContain('<DateTime />');
    });

    it('should convert a prompt with multiple input types', () => {
      const md = [
        '---',
        'title: New Project',
        'tags: []',
        '---',
        '',
        'Create a project called {{input "projectName"}}.',
        'Language: {{input "lang"}}.',
        'Requirements:',
        '{{editor "requirements"}}',
        'Output: {{input "designFile"}}.',
      ].join('\n');

      const result = convertPrompt(md, 'new-project.md');

      expect(result.askComponents).toHaveLength(4);
      expect(result.askComponents.map(c => c.name)).toEqual([
        'projectName', 'lang', 'requirements', 'designFile',
      ]);
      expect(result.output).toContain('{inputs.projectName}');
      expect(result.output).toContain('{inputs.lang}');
      expect(result.output).toContain('{inputs.requirements}');
    });

    it('should handle frontmatter variables with defaults', () => {
      const md = [
        '---',
        'title: Simple Test',
        'vars:',
        '  message:',
        '    type: text',
        '    default: "Hello from simple test"',
        '---',
        '',
        '# Simple Test',
        '{{message}}',
      ].join('\n');

      const result = convertPrompt(md, 'simple-test.md');

      expect(result.askComponents).toHaveLength(1);
      expect(result.askComponents[0].tag).toBe('Ask.Text');
      expect(result.askComponents[0].name).toBe('message');
      expect(result.askComponents[0].props['default']).toBe('"Hello from simple test"');
      expect(result.output).toContain('{inputs.message}');
    });

    it('should handle frontmatter variables array with file type', () => {
      const md = [
        '---',
        'title: Implementation Plan',
        'variables:',
        '  - name: designFile',
        '    type: file',
        '    message: Select the design file',
        '    filter: "*.md"',
        '    basePath: "."',
        '---',
        '',
        'Analyze {{file "designFile"}}.',
      ].join('\n');

      const result = convertPrompt(md, 'impl-plan.md');

      expect(result.askComponents).toHaveLength(1);
      expect(result.askComponents[0].tag).toBe('Ask.File');
      expect(result.askComponents[0].label).toBe('Select the design file');
      expect(result.askComponents[0].props['filter']).toBe('"*.md"');
      expect(result.askComponents[0].props['basePath']).toBe('"."');
    });

    it('should handle select variable with choices', () => {
      const md = [
        '---',
        'title: Choose Language',
        'variables:',
        '  - name: lang',
        '    type: select',
        '    message: Pick a language',
        '    choices:',
        '      - TypeScript',
        '      - Python',
        '      - Rust',
        '---',
        '',
        'You chose {{lang}}.',
      ].join('\n');

      const result = convertPrompt(md, 'choose-lang.md');

      expect(result.askComponents).toHaveLength(1);
      const comp = result.askComponents[0];
      expect(comp.tag).toBe('Ask.Select');
      expect(comp.selfClosing).toBe(false);
      expect(comp.children).toContain('TypeScript');
      expect(comp.children).toContain('Python');
      expect(comp.children).toContain('Rust');
      expect(result.output).toContain('<Option');
      expect(result.output).toContain('{inputs.lang}');
    });

    it('should handle prompt with no interactive helpers', () => {
      const md = [
        '---',
        'title: Static Prompt',
        'tags: [info]',
        '---',
        '',
        '**Role**: You are a helper.',
        '',
        '**Task**: Explain something.',
      ].join('\n');

      const result = convertPrompt(md, 'static.md');

      expect(result.askComponents).toHaveLength(0);
      expect(result.output).toContain('<Prompt name="static-prompt"');
      expect(result.output).toContain('<Role>');
      expect(result.output).toContain('<Task>');
      expect(result.output).not.toContain('<PostExecution>');
    });

    it('should use summary as description if present', () => {
      const md = [
        '---',
        'title: My Prompt',
        'summary: A useful prompt for testing',
        '---',
        '',
        'Hello world.',
      ].join('\n');

      const result = convertPrompt(md, 'my-prompt.md');
      expect(result.description).toBe('A useful prompt for testing');
    });

    it('should fall back to filename basename when no title', () => {
      const md = 'Just some content with no frontmatter.';
      const result = convertPrompt(md, '/path/to/my-prompt.md');
      expect(result.promptName).toBe('my-prompt');
    });

    it('should convert all static helpers', () => {
      const md = [
        '---',
        'title: Statics',
        '---',
        '',
        'Date: {{date}}',
        'Time: {{time}}',
        'DateTime: {{datetime}}',
        'Timestamp: {{timestamp}}',
        'UUID: {{uuid}}',
        'Username: {{username}}',
        'Hostname: {{hostname}}',
        'CWD: {{cwd}}',
      ].join('\n');

      const result = convertPrompt(md, 'statics.md');

      expect(result.output).toContain('<DateTime />');
      expect(result.output).toContain('<Timestamp />');
      expect(result.output).toContain('<UUID />');
      expect(result.output).toContain('<Username />');
      expect(result.output).toContain('<Hostname />');
      expect(result.output).toContain('<Cwd />');
    });

    it('should convert block helpers (#each, #if, #unless)', () => {
      const md = [
        '---',
        'title: Blocks',
        '---',
        '',
        '{{#each items}}{{this}}{{/each}}',
        '{{#if show}}visible{{/if}}',
        '{{#unless hide}}shown{{/unless}}',
      ].join('\n');

      const result = convertPrompt(md, 'blocks.md');

      expect(result.output).toContain('<ForEach items={inputs.items}>');
      expect(result.output).toContain('{item}');
      expect(result.output).toContain('<If condition={inputs.show}>');
      expect(result.output).toContain('<If condition={!inputs.hide}>');
    });

    it('should handle raw blocks', () => {
      const md = [
        '---',
        'title: Raw',
        '---',
        '',
        '{{#raw}}{{literal}}{{/raw}}',
      ].join('\n');

      const result = convertPrompt(md, 'raw.md');
      expect(result.output).toContain('{{literal}}');
    });

    it('should detect all section types', () => {
      const md = [
        '---',
        'title: All Sections',
        '---',
        '',
        '**Role**: Expert.',
        '',
        '**Context**: Background info.',
        '',
        '**Objective**: Do task.',
        '',
        '**Requirements**:',
        '- Req 1',
        '',
        '**Format**: Markdown.',
        '',
        '**Examples**:',
        'Example 1.',
        '',
        '**Success Criteria**:',
        '- All tests pass',
        '- No regressions',
        '',
        '**Audience**: Developers.',
        '',
        '**Tone**: Professional.',
      ].join('\n');

      const result = convertPrompt(md, 'all-sections.md');
      expect(result.sections.map(s => s.type)).toContain('Role');
      expect(result.sections.map(s => s.type)).toContain('Context');
      expect(result.sections.map(s => s.type)).toContain('Task');
      expect(result.sections.map(s => s.type)).toContain('Constraint');
      expect(result.sections.map(s => s.type)).toContain('Format');
      expect(result.sections.map(s => s.type)).toContain('SuccessCriteria');
      expect(result.output).toContain('<SuccessCriteria>');
      expect(result.output).toContain('<Criterion>');
    });

    it('should handle validate property as pattern', () => {
      const md = [
        '---',
        'title: Validated',
        'variables:',
        '  - name: email',
        '    type: input',
        '    validate: "^[^@]+@[^@]+$"',
        '---',
        '',
        'Email: {{email}}',
      ].join('\n');

      const result = convertPrompt(md, 'validated.md');
      expect(result.askComponents[0].props['pattern']).toBe('"^[^@]+@[^@]+$"');
    });

    it('should handle non-string default values', () => {
      const md = [
        '---',
        'title: Defaults',
        'variables:',
        '  - name: count',
        '    type: input',
        '    default: 42',
        '  - name: enabled',
        '    type: confirm',
        '    default: true',
        '---',
        '',
        'Count: {{count}}, Enabled: {{enabled}}',
      ].join('\n');

      const result = convertPrompt(md, 'defaults.md');
      expect(result.askComponents[0].props['default']).toBe('42');
      expect(result.askComponents[1].props['default']).toBe('true');
    });

    it('should handle frontmatter with autoReview property', () => {
      const md = [
        '---',
        'title: AutoReview',
        'variables:',
        '  - name: output',
        '    type: reviewFile',
        '    autoReview: true',
        '---',
        '',
        '{{reviewFile "output"}}',
      ].join('\n');

      const result = convertPrompt(md, 'auto-review.md');
      expect(result.askComponents).toHaveLength(1);
      expect(result.askComponents[0].tag).toBe('Ask.ReviewFile');
    });

    it('should handle all interactive helper types inline', () => {
      const md = [
        '---',
        'title: All Helpers',
        '---',
        '',
        '{{select "choice"}}',
        '{{multiselect "multi"}}',
        '{{confirm "ok"}}',
        '{{password "secret"}}',
      ].join('\n');

      const result = convertPrompt(md, 'all-helpers.md');
      expect(result.askComponents.map(c => c.tag)).toContain('Ask.Select');
      expect(result.askComponents.map(c => c.tag)).toContain('Ask.MultiSelect');
      expect(result.askComponents.map(c => c.tag)).toContain('Ask.Confirm');
      expect(result.askComponents.map(c => c.tag)).toContain('Ask.Secret');
    });

    it('should handle helper with custom message', () => {
      const md = [
        '---',
        'title: Messages',
        '---',
        '',
        '{{input "name" "Enter your full name"}}',
      ].join('\n');

      const result = convertPrompt(md, 'messages.md');
      expect(result.askComponents[0].label).toBe('Enter your full name');
    });

    it('should generate label from camelCase variable name', () => {
      const md = [
        '---',
        'title: Labels',
        '---',
        '',
        '{{input "firstName"}}',
      ].join('\n');

      const result = convertPrompt(md, 'labels.md');
      expect(result.askComponents[0].label).toBe('First name:');
    });

    it('should generate label from underscore variable name', () => {
      const md = [
        '---',
        'title: Labels',
        '---',
        '',
        '{{input "first_name"}}',
      ].join('\n');

      const result = convertPrompt(md, 'labels.md');
      expect(result.askComponents[0].label).toBe('First name:');
    });

    it('should use different label suffixes for different helper types', () => {
      const md = [
        '---',
        'title: Suffixes',
        '---',
        '',
        '{{confirm "isReady"}}',
        '{{multiselect "items"}}',
        '{{editor "content"}}',
      ].join('\n');

      const result = convertPrompt(md, 'suffixes.md');
      const confirm = result.askComponents.find(c => c.name === 'isReady');
      const multi = result.askComponents.find(c => c.name === 'items');
      const editor = result.askComponents.find(c => c.name === 'content');

      expect(confirm?.label).toContain('?');
      expect(multi?.label).toContain('select multiple');
      expect(editor?.label).toContain('press enter to open editor');
    });

    it('should handle SuccessCriteria with non-bullet content', () => {
      const md = [
        '---',
        'title: Criteria',
        '---',
        '',
        '**Success Criteria**: The task is complete.',
      ].join('\n');

      const result = convertPrompt(md, 'criteria.md');
      expect(result.output).toContain('<SuccessCriteria>');
      expect(result.output).toContain('<Criterion>');
    });

    it('should handle empty body sections', () => {
      const md = [
        '---',
        'title: Empty',
        '---',
        '',
      ].join('\n');

      const result = convertPrompt(md, 'empty.md');
      expect(result.output).toContain('<Prompt');
      expect(result.output).toContain('</Prompt>');
    });

    it('should escape special characters in JSX attributes', () => {
      const md = [
        '---',
        'title: He said "hello"',
        '---',
        '',
        'Content.',
      ].join('\n');

      const result = convertPrompt(md, 'escape.md');
      expect(result.output).toContain('description="He said \\"hello\\""');
    });

    it('should handle unknown frontmatter variable types as input', () => {
      const md = [
        '---',
        'title: Unknown',
        'variables:',
        '  - name: custom',
        '    type: unknownType',
        '---',
        '',
        '{{custom}}',
      ].join('\n');

      const result = convertPrompt(md, 'unknown.md');
      expect(result.askComponents[0].tag).toBe('Ask.Text');
    });

    it('should handle review-file type mapping', () => {
      const md = [
        '---',
        'title: Review',
        'variables:',
        '  - name: output',
        '    type: review-file',
        '---',
        '',
        '{{reviewFile "output"}}',
      ].join('\n');

      const result = convertPrompt(md, 'review.md');
      expect(result.askComponents[0].tag).toBe('Ask.ReviewFile');
    });

    it('should add conversion comment with source filename', () => {
      const result = convertPrompt('Content.', 'my-file.md');
      expect(result.output).toContain('{/* Converted from my-file.md */}');
    });

    it('should escape special characters in JSX children with choices', () => {
      const md = [
        '---',
        'title: Special',
        'variables:',
        '  - name: choice',
        '    type: select',
        '    choices:',
        '      - "Option <A>"',
        '      - "Option {B}"',
        '---',
        '',
        '{{choice}}',
      ].join('\n');

      const result = convertPrompt(md, 'special.md');
      expect(result.output).toContain('&lt;A&gt;');
      expect(result.output).toContain('&#123;B&#125;');
    });
  });
});
