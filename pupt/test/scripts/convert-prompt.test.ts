import { describe, it, expect } from 'vitest';
import {
  parseHelperCalls,
  buildAskComponents,
  convertBody,
  detectSections,
  convertPrompt,
  titleToName,
} from '../../scripts/convert-prompt.js';

describe('parseHelperCalls', () => {
  it('should parse simple input helper', () => {
    const calls = parseHelperCalls('Hello {{input "name"}}');
    expect(calls).toHaveLength(1);
    expect(calls[0].helperName).toBe('input');
    expect(calls[0].varName).toBe('name');
    expect(calls[0].message).toBeUndefined();
  });

  it('should parse helper with message', () => {
    const calls = parseHelperCalls('{{input "name" "Enter your name"}}');
    expect(calls).toHaveLength(1);
    expect(calls[0].message).toBe('Enter your name');
  });

  it('should parse multiple helpers', () => {
    const body = '{{input "a"}} and {{editor "b"}} and {{file "c"}}';
    const calls = parseHelperCalls(body);
    expect(calls).toHaveLength(3);
    expect(calls.map(c => c.helperName)).toEqual(['input', 'editor', 'file']);
    expect(calls.map(c => c.varName)).toEqual(['a', 'b', 'c']);
  });

  it('should parse all interactive helper types', () => {
    const helpers = ['input', 'select', 'multiselect', 'confirm', 'editor', 'password', 'file', 'reviewFile'];
    for (const h of helpers) {
      const calls = parseHelperCalls(`{{${h} "var"}}`);
      expect(calls).toHaveLength(1);
      expect(calls[0].helperName).toBe(h);
    }
  });

  it('should not parse static helpers', () => {
    const calls = parseHelperCalls('{{date}} {{uuid}} {{hostname}}');
    expect(calls).toHaveLength(0);
  });

  it('should handle duplicate helper calls', () => {
    const calls = parseHelperCalls('{{reviewFile "out"}} and again {{reviewFile "out"}}');
    expect(calls).toHaveLength(2);
    expect(calls[0].varName).toBe('out');
    expect(calls[1].varName).toBe('out');
  });
});

describe('buildAskComponents', () => {
  it('should build component from helper call', () => {
    const calls = [{ helperName: 'input', varName: 'name', fullMatch: '{{input "name"}}' }];
    const components = buildAskComponents(calls, []);
    expect(components).toHaveLength(1);
    expect(components[0].tag).toBe('Ask.Text');
    expect(components[0].name).toBe('name');
    expect(components[0].selfClosing).toBe(true);
  });

  it('should deduplicate by variable name', () => {
    const calls = [
      { helperName: 'reviewFile', varName: 'out', fullMatch: '{{reviewFile "out"}}' },
      { helperName: 'reviewFile', varName: 'out', fullMatch: '{{reviewFile "out"}}' },
    ];
    const components = buildAskComponents(calls, []);
    expect(components).toHaveLength(1);
  });

  it('should prefer frontmatter variable over inline call', () => {
    const calls = [{ helperName: 'input', varName: 'name', fullMatch: '{{input "name"}}' }];
    const fmVars = [{
      name: 'name',
      type: 'input',
      message: 'Enter your name',
      default: 'World',
    }];
    const components = buildAskComponents(calls, fmVars);
    expect(components).toHaveLength(1);
    expect(components[0].label).toBe('Enter your name');
    expect(components[0].props['default']).toBe('"World"');
  });

  it('should map helper types to correct Ask components', () => {
    const mapping: Record<string, string> = {
      input: 'Ask.Text',
      select: 'Ask.Select',
      multiselect: 'Ask.MultiSelect',
      confirm: 'Ask.Confirm',
      editor: 'Ask.Editor',
      password: 'Ask.Secret',
      file: 'Ask.File',
      reviewFile: 'Ask.ReviewFile',
    };
    for (const [helper, tag] of Object.entries(mapping)) {
      const components = buildAskComponents(
        [{ helperName: helper, varName: 'v', fullMatch: `{{${helper} "v"}}` }],
        [],
      );
      expect(components[0].tag).toBe(tag);
    }
  });

  it('should generate Option children for frontmatter variables with choices', () => {
    const fmVars = [{
      name: 'lang',
      type: 'select',
      choices: ['TypeScript', 'Python'],
    }];
    const components = buildAskComponents([], fmVars);
    expect(components).toHaveLength(1);
    expect(components[0].selfClosing).toBe(false);
    expect(components[0].children).toContain('TypeScript');
    expect(components[0].children).toContain('Python');
    expect(components[0].children).toContain('<Option');
  });

  it('should include basePath and filter props for file variables', () => {
    const fmVars = [{
      name: 'src',
      type: 'file',
      basePath: './src',
      filter: '*.ts',
    }];
    const components = buildAskComponents([], fmVars);
    expect(components[0].props['basePath']).toBe('"./src"');
    expect(components[0].props['filter']).toBe('"*.ts"');
  });

  it('should include validate as pattern prop', () => {
    const fmVars = [{
      name: 'email',
      type: 'input',
      validate: '^[^@]+@[^@]+$',
    }];
    const components = buildAskComponents([], fmVars);
    expect(components[0].props['pattern']).toBe('"^[^@]+@[^@]+$"');
  });
});

describe('convertBody', () => {
  it('should replace static helpers with JSX components', () => {
    expect(convertBody('Today is {{date}}')).toBe('Today is <DateTime />');
    expect(convertBody('{{uuid}}')).toBe('<UUID />');
    expect(convertBody('Host: {{hostname}}')).toBe('Host: <Hostname />');
  });

  it('should replace interactive helpers with input references', () => {
    expect(convertBody('Hello {{input "name"}}')).toBe('Hello {inputs.name}');
    expect(convertBody('{{editor "code"}}')).toBe('{inputs.code}');
    expect(convertBody('{{reviewFile "out"}}')).toBe('{inputs.out}');
  });

  it('should replace simple variable references', () => {
    expect(convertBody('Hello {{myVar}}')).toBe('Hello {inputs.myVar}');
  });

  it('should not replace block helper syntax', () => {
    const body = '{{#if show}}visible{{/if}}';
    const result = convertBody(body);
    expect(result).toContain('<If condition={inputs.show}>');
    expect(result).toContain('visible');
    expect(result).toContain('</If>');
  });

  it('should convert {{#unless}} to negated If', () => {
    const result = convertBody('{{#unless hide}}shown{{/unless}}');
    expect(result).toContain('<If condition={!inputs.hide}>');
    expect(result).toContain('shown');
  });

  it('should convert {{#each}} to ForEach', () => {
    const result = convertBody('{{#each items}}{{this}}{{/each}}');
    expect(result).toContain('<ForEach items={inputs.items}>');
    expect(result).toContain('{item}');
  });

  it('should strip raw block wrappers', () => {
    expect(convertBody('{{#raw}}{{literal}}{{/raw}}')).toBe('{{literal}}');
  });

  it('should handle helper with message argument', () => {
    expect(convertBody('{{input "name" "Your name"}}')).toBe('{inputs.name}');
  });
});

describe('detectSections', () => {
  it('should detect Role section', () => {
    const sections = detectSections('**Role & Context**: You are an expert.');
    expect(sections).toHaveLength(1);
    expect(sections[0].type).toBe('Role');
    expect(sections[0].content).toContain('You are an expert.');
  });

  it('should detect Task/Objective section', () => {
    const sections = detectSections('**Objective**: Do something.');
    expect(sections).toHaveLength(1);
    expect(sections[0].type).toBe('Task');
  });

  it('should detect Constraint section from Requirements', () => {
    const sections = detectSections('**Specific Requirements**:\n- Item 1\n- Item 2');
    expect(sections).toHaveLength(1);
    expect(sections[0].type).toBe('Constraint');
    expect(sections[0].content).toContain('Item 1');
  });

  it('should detect multiple sections', () => {
    const body = [
      '**Role**: Expert coder.',
      '',
      '**Task**: Write code.',
      '',
      '**Constraints**: No bugs.',
    ].join('\n');
    const sections = detectSections(body);
    expect(sections.length).toBeGreaterThanOrEqual(3);
    expect(sections.map(s => s.type)).toContain('Role');
    expect(sections.map(s => s.type)).toContain('Task');
    expect(sections.map(s => s.type)).toContain('Constraint');
  });

  it('should detect Format section', () => {
    const sections = detectSections('**Format & Structure**: Use markdown.');
    expect(sections).toHaveLength(1);
    expect(sections[0].type).toBe('Format');
  });

  it('should detect SuccessCriteria section', () => {
    const sections = detectSections('**Success Criteria**:\n- All tests pass\n- No regressions');
    expect(sections).toHaveLength(1);
    expect(sections[0].type).toBe('SuccessCriteria');
  });

  it('should put unrecognized content in Section', () => {
    const sections = detectSections('Some content with no heading pattern.');
    expect(sections).toHaveLength(1);
    expect(sections[0].type).toBe('Section');
  });
});

describe('titleToName', () => {
  it('should convert title to kebab-case', () => {
    expect(titleToName('Code Review')).toBe('code-review');
    expect(titleToName('Ad Hoc')).toBe('ad-hoc');
    expect(titleToName('New Project')).toBe('new-project');
  });

  it('should handle special characters', () => {
    expect(titleToName('Hello, World!')).toBe('hello-world');
    expect(titleToName('  Spaces  ')).toBe('spaces');
  });
});

describe('convertPrompt (full integration)', () => {
  it('should convert a simple ad-hoc style prompt', () => {
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
    expect(result.askComponents).toHaveLength(1);
    expect(result.askComponents[0].tag).toBe('Ask.Text');
    expect(result.askComponents[0].name).toBe('prompt');
    expect(result.output).toContain('<Prompt name="ad-hoc"');
    expect(result.output).toContain('<Ask.Text name="prompt"');
    expect(result.output).toContain('<Role>');
    expect(result.output).toContain('{inputs.prompt}');
    expect(result.output).toContain('</Prompt>');
    expect(result.reviewFileVars).toHaveLength(0);
  });

  it('should convert a prompt with reviewFile and editor', () => {
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
    // Should have reviewFile and editor Ask components
    expect(result.askComponents.some(c => c.tag === 'Ask.ReviewFile')).toBe(true);
    expect(result.askComponents.some(c => c.tag === 'Ask.Editor')).toBe(true);
    // reviewFile deduplication
    expect(result.askComponents.filter(c => c.name === 'outputFile')).toHaveLength(1);
    // PostExecution block
    expect(result.reviewFileVars).toContain('outputFile');
    expect(result.output).toContain('<PostExecution>');
    expect(result.output).toContain('<ReviewFile file={inputs.outputFile} />');
    // Static helper replacement
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

  it('should convert a prompt with file selection from frontmatter', () => {
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

  it('should handle select variable with choices from frontmatter', () => {
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

  it('should generate valid closing tags', () => {
    const md = [
      '---',
      'title: Test',
      '---',
      '',
      '**Role**: Expert.',
    ].join('\n');

    const result = convertPrompt(md, 'test.md');
    expect(result.output).toMatch(/<\/Prompt>\s*$/);
  });
});
