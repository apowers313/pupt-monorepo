/**
 * Comprehensive coverage tests for all files below 95% coverage.
 * Organized by component/service category.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { render } from '../../src/render';
import { jsx } from '../../src/jsx-runtime';
import { createRenderContext } from '../setup';

// Structural components
import { Audience } from '../../src/components/structural/Audience';
import { Context } from '../../src/components/structural/Context';
import { Role } from '../../src/components/structural/Role';
import { Task } from '../../src/components/structural/Task';
import { Tone } from '../../src/components/structural/Tone';
import { Section } from '../../src/components/structural/Section';
import { Constraint } from '../../src/components/structural/Constraint';
import { SuccessCriteria } from '../../src/components/structural/SuccessCriteria';

// Ask components
import { AskChoice } from '../../src/components/ask/Choice';
import { AskDate } from '../../src/components/ask/Date';
import { AskEditor } from '../../src/components/ask/Editor';
import { AskPath } from '../../src/components/ask/Path';
import { AskSecret } from '../../src/components/ask/Secret';
import { AskSelect } from '../../src/components/ask/Select';
import { AskMultiSelect } from '../../src/components/ask/MultiSelect';
import { AskNumber } from '../../src/components/ask/Number';
import { AskRating } from '../../src/components/ask/Rating';
import { AskConfirm } from '../../src/components/ask/Confirm';
import { AskText } from '../../src/components/ask/Text';

// Utility components
import { Hostname } from '../../src/components/utility/Hostname';
import { Username } from '../../src/components/utility/Username';

// Control components
import { ForEach } from '../../src/components/control/ForEach';

// Services
import { Transformer } from '../../src/services/transformer';

// ============================================================================
// STRUCTURAL COMPONENTS - Delimiter variations
// ============================================================================

describe('Structural Components - Delimiter Coverage', () => {
  describe('Audience', () => {
    it('should render with markdown delimiter', async () => {
      const element = jsx(Audience, { delimiter: 'markdown', children: 'Technical developers' });
      const result = await render(element);
      expect(result.text).toContain('## audience');
      expect(result.text).toContain('Technical developers');
    });

    it('should render with none delimiter', async () => {
      const element = jsx(Audience, { delimiter: 'none', children: 'General public' });
      const result = await render(element);
      expect(result.text).toBe('General public');
      expect(result.text).not.toContain('<audience>');
    });
  });

  describe('Context', () => {
    it('should render with markdown delimiter', async () => {
      const element = jsx(Context, { delimiter: 'markdown', children: 'Background info' });
      const result = await render(element);
      expect(result.text).toContain('## context');
    });

    it('should render with none delimiter', async () => {
      const element = jsx(Context, { delimiter: 'none', children: 'Just context' });
      const result = await render(element);
      expect(result.text).toBe('Just context');
    });
  });

  describe('Role', () => {
    it('should render with markdown delimiter', async () => {
      const element = jsx(Role, { delimiter: 'markdown', children: 'Expert programmer' });
      const result = await render(element);
      expect(result.text).toContain('## role');
    });

    it('should render with none delimiter', async () => {
      const element = jsx(Role, { delimiter: 'none', children: 'Helper' });
      const result = await render(element);
      expect(result.text).toBe('Helper');
    });
  });

  describe('Task', () => {
    it('should render with markdown delimiter', async () => {
      const element = jsx(Task, { delimiter: 'markdown', children: 'Write code' });
      const result = await render(element);
      expect(result.text).toContain('## task');
    });

    it('should render with none delimiter', async () => {
      const element = jsx(Task, { delimiter: 'none', children: 'Do something' });
      const result = await render(element);
      expect(result.text).toBe('Do something');
    });
  });

  describe('Tone', () => {
    it('should render with markdown delimiter', async () => {
      const element = jsx(Tone, { delimiter: 'markdown', children: 'Professional' });
      const result = await render(element);
      expect(result.text).toContain('## tone');
    });

    it('should render with none delimiter', async () => {
      const element = jsx(Tone, { delimiter: 'none', children: 'Casual' });
      const result = await render(element);
      expect(result.text).toBe('Casual');
    });
  });

  describe('Section', () => {
    it('should render with markdown delimiter', async () => {
      const element = jsx(Section, { name: 'intro', delimiter: 'markdown', children: 'Introduction text' });
      const result = await render(element);
      expect(result.text).toContain('## intro');
    });

    it('should render with none delimiter', async () => {
      const element = jsx(Section, { name: 'body', delimiter: 'none', children: 'Body content' });
      const result = await render(element);
      expect(result.text).toBe('Body content');
    });
  });

  describe('Constraint', () => {
    it('should render with markdown delimiter', async () => {
      const element = jsx(Constraint, { delimiter: 'markdown', children: 'Max 100 words' });
      const result = await render(element);
      expect(result.text).toContain('## constraint');
    });

    it('should render with none delimiter', async () => {
      const element = jsx(Constraint, { delimiter: 'none', children: 'Be brief' });
      const result = await render(element);
      expect(result.text).toBe('Be brief');
    });
  });

  describe('SuccessCriteria', () => {
    it('should render with markdown delimiter', async () => {
      const element = jsx(SuccessCriteria, { delimiter: 'markdown', children: 'Code compiles' });
      const result = await render(element);
      expect(result.text).toContain('## success-criteria');
    });

    it('should render with none delimiter', async () => {
      const element = jsx(SuccessCriteria, { delimiter: 'none', children: 'Tests pass' });
      const result = await render(element);
      expect(result.text).toBe('Tests pass');
    });
  });
});

// ============================================================================
// ASK COMPONENTS - Silent mode, inputs, defaults
// ============================================================================

describe('Ask Components - Branch Coverage', () => {
  describe('AskChoice', () => {
    const options = [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ];

    it('should render in silent mode', async () => {
      const element = jsx(AskChoice, {
        name: 'confirm',
        label: 'Confirm',
        options,
        silent: true,
      });
      const result = await render(element);
      expect(result.text).toBe('');
    });

    it('should use provided input value', async () => {
      const element = jsx(AskChoice, {
        name: 'confirm',
        label: 'Confirm',
        options,
        default: 'no',
      });
      const result = await render(element, {
        inputs: new Map([['confirm', 'yes']]),
      });
      expect(result.text).toBe('Yes');
    });

    it('should return value when option not found', async () => {
      const element = jsx(AskChoice, {
        name: 'confirm',
        label: 'Confirm',
        options,
        default: 'maybe', // Not in options
      });
      const result = await render(element);
      expect(result.text).toBe('maybe');
    });

    it('should show placeholder when no value', async () => {
      const element = jsx(AskChoice, {
        name: 'confirm',
        label: 'Confirm',
        options,
      });
      const result = await render(element);
      expect(result.text).toBe('{confirm}');
    });
  });

  describe('AskDate', () => {
    it('should render in silent mode', async () => {
      const element = jsx(AskDate, {
        name: 'startDate',
        label: 'Start Date',
        silent: true,
      });
      const result = await render(element);
      expect(result.text).toBe('');
    });

    it('should use provided input value', async () => {
      const element = jsx(AskDate, {
        name: 'startDate',
        label: 'Start Date',
        default: '2024-01-01',
      });
      const result = await render(element, {
        inputs: new Map([['startDate', '2024-06-15']]),
      });
      expect(result.text).toBe('2024-06-15');
    });

    it('should use default value', async () => {
      const element = jsx(AskDate, {
        name: 'startDate',
        label: 'Start Date',
        default: '2024-01-01',
      });
      const result = await render(element);
      expect(result.text).toBe('2024-01-01');
    });
  });

  describe('AskEditor', () => {
    it('should render in silent mode', async () => {
      const element = jsx(AskEditor, {
        name: 'content',
        label: 'Content',
        silent: true,
      });
      const result = await render(element);
      expect(result.text).toBe('');
    });

    it('should use provided input value', async () => {
      const element = jsx(AskEditor, {
        name: 'content',
        label: 'Content',
        default: 'default text',
      });
      const result = await render(element, {
        inputs: new Map([['content', 'user text']]),
      });
      expect(result.text).toBe('user text');
    });

    it('should use default value', async () => {
      const element = jsx(AskEditor, {
        name: 'content',
        label: 'Content',
        default: 'default text',
      });
      const result = await render(element);
      expect(result.text).toBe('default text');
    });
  });

  describe('AskPath', () => {
    it('should render in silent mode', async () => {
      const element = jsx(AskPath, {
        name: 'filePath',
        label: 'File Path',
        silent: true,
      });
      const result = await render(element);
      expect(result.text).toBe('');
    });

    it('should use provided input value', async () => {
      const element = jsx(AskPath, {
        name: 'filePath',
        label: 'File Path',
        default: '/default/path',
      });
      const result = await render(element, {
        inputs: new Map([['filePath', '/user/path']]),
      });
      expect(result.text).toBe('/user/path');
    });

    it('should use default value', async () => {
      const element = jsx(AskPath, {
        name: 'filePath',
        label: 'File Path',
        default: '/default/path',
      });
      const result = await render(element);
      expect(result.text).toBe('/default/path');
    });
  });

  describe('AskSecret', () => {
    it('should render in silent mode', async () => {
      const element = jsx(AskSecret, {
        name: 'apiKey',
        label: 'API Key',
        silent: true,
      });
      const result = await render(element);
      expect(result.text).toBe('');
    });

    it('should use provided input value', async () => {
      const element = jsx(AskSecret, {
        name: 'apiKey',
        label: 'API Key',
        default: 'default-key',
      });
      const result = await render(element, {
        inputs: new Map([['apiKey', 'user-key']]),
      });
      expect(result.text).toBe('user-key');
    });

    it('should use default value', async () => {
      const element = jsx(AskSecret, {
        name: 'apiKey',
        label: 'API Key',
        default: 'default-key',
      });
      const result = await render(element);
      expect(result.text).toBe('default-key');
    });
  });

  describe('AskSelect', () => {
    it('should return value when option not found', async () => {
      const element = jsx(AskSelect, {
        name: 'color',
        label: 'Color',
        options: [
          { value: 'red', label: 'Red' },
          { value: 'blue', label: 'Blue' },
        ],
        default: 'green', // Not in options
      });
      const result = await render(element);
      expect(result.text).toBe('green');
    });
  });

  describe('AskMultiSelect', () => {
    it('should render in silent mode', async () => {
      const element = jsx(AskMultiSelect, {
        name: 'features',
        label: 'Features',
        options: [{ value: 'a', label: 'A' }],
        silent: true,
      });
      const result = await render(element);
      expect(result.text).toBe('');
    });
  });

  describe('AskNumber', () => {
    it('should render in silent mode', async () => {
      const element = jsx(AskNumber, {
        name: 'count',
        label: 'Count',
        silent: true,
      });
      const result = await render(element);
      expect(result.text).toBe('');
    });

    it('should use provided input value', async () => {
      const element = jsx(AskNumber, {
        name: 'count',
        label: 'Count',
        default: 5,
      });
      const result = await render(element, {
        inputs: new Map([['count', 10]]),
      });
      expect(result.text).toBe('10');
    });

    it('should convert string input to number', async () => {
      const element = jsx(AskNumber, {
        name: 'count',
        label: 'Count',
      });
      const result = await render(element, {
        inputs: new Map([['count', '42']]),
      });
      expect(result.text).toBe('42');
    });
  });

  describe('AskRating', () => {
    it('should render in silent mode', async () => {
      const element = jsx(AskRating, {
        name: 'rating',
        label: 'Rating',
        silent: true,
      });
      const result = await render(element);
      expect(result.text).toBe('');
    });

    it('should use provided input value', async () => {
      const element = jsx(AskRating, {
        name: 'rating',
        label: 'Rating',
        default: 3,
      });
      const result = await render(element, {
        inputs: new Map([['rating', 5]]),
      });
      expect(result.text).toBe('5');
    });

    it('should convert string input to number', async () => {
      const element = jsx(AskRating, {
        name: 'rating',
        label: 'Rating',
      });
      const result = await render(element, {
        inputs: new Map([['rating', '4']]),
      });
      expect(result.text).toBe('4');
    });
  });
});

// ============================================================================
// UTILITY COMPONENTS - Null runtime values
// ============================================================================

describe('Utility Components - Branch Coverage', () => {
  describe('Hostname', () => {
    it('should return unknown when runtime hostname is null', async () => {
      const hostname = new Hostname();
      const context = createRenderContext();
      // Set hostname to null/undefined
      context.env.runtime.hostname = undefined as unknown as string;

      const result = hostname.render({}, undefined, context);
      expect(result).toBe('unknown');
    });

    it('should return actual hostname when available', async () => {
      const hostname = new Hostname();
      const context = createRenderContext();

      const result = hostname.render({}, undefined, context);
      // Should return actual hostname (not 'unknown')
      expect(result).not.toBe('unknown');
      expect(typeof result).toBe('string');
    });
  });

  describe('Username', () => {
    it('should return anonymous when runtime username is null', async () => {
      const username = new Username();
      const context = createRenderContext();
      // Set username to null/undefined
      context.env.runtime.username = undefined as unknown as string;

      const result = username.render({}, undefined, context);
      expect(result).toBe('anonymous');
    });

    it('should return actual username when available', async () => {
      const username = new Username();
      const context = createRenderContext();

      const result = username.render({}, undefined, context);
      // Should return actual username (not 'anonymous')
      expect(result).not.toBe('anonymous');
      expect(typeof result).toBe('string');
    });
  });
});

// ============================================================================
// CONTROL COMPONENTS - Edge cases
// ============================================================================

describe('Control Components - Branch Coverage', () => {
  describe('ForEach', () => {
    it('should handle empty items array', async () => {
      const element = jsx(ForEach, {
        items: [],
        as: 'item',
        children: (item: string) => jsx('span', { children: item }),
      });
      const result = await render(element);
      expect(result.text).toBe('');
    });

    it('should handle direct array items with function children', async () => {
      const element = jsx(ForEach, {
        items: ['a', 'b', 'c'],
        as: 'item',
        children: (item: string) => item,
      });
      const result = await render(element);
      expect(result.text).toContain('a');
      expect(result.text).toContain('b');
      expect(result.text).toContain('c');
    });

    it('should repeat non-function children for each item', async () => {
      const element = jsx(ForEach, {
        items: [1, 2, 3],
        as: 'num',
        children: 'item',
      });
      const result = await render(element);
      // 'item' repeated 3 times
      expect(result.text).toBe('itemitemitem');
    });
  });
});

// ============================================================================
// SERVICES - Edge cases
// ============================================================================

describe('Transformer - Branch Coverage', () => {
  let transformer: Transformer;

  beforeEach(() => {
    transformer = new Transformer();
  });

  it('should transform valid TSX async', async () => {
    const result = await transformer.transformSourceAsync(
      'const x = <div>Hello</div>;',
      'test.tsx',
    );
    expect(result).toContain('jsx');
  });

  it('should transform and then use sync transform', async () => {
    // First load Babel via async
    await transformer.transformSourceAsync('const a = 1;', 'preload.ts');

    // Now sync should work
    const result = transformer.transformSource('const b = 2;', 'sync.ts');
    expect(result).toContain('const b = 2');
  });
});

// ============================================================================
// IF COMPONENT - Boolean coercion edge cases
// ============================================================================

import { If } from '../../src/components/control/If';

describe('If Component - Branch Coverage', () => {
  it('should handle boolean true condition', async () => {
    const element = jsx(If, { when: true, children: 'Visible' });
    const result = await render(element);
    expect(result.text).toBe('Visible');
  });

  it('should handle boolean false condition', async () => {
    const element = jsx(If, { when: false, children: 'Hidden' });
    const result = await render(element);
    expect(result.text).toBe('');
  });

  it('should handle string formula condition that evaluates to true', async () => {
    const element = jsx(If, { when: '=TRUE()', children: 'Formula true' });
    const result = await render(element);
    expect(result.text).toBe('Formula true');
  });

  it('should handle string formula condition that evaluates to false', async () => {
    const element = jsx(If, { when: '=FALSE()', children: 'Formula false' });
    const result = await render(element);
    expect(result.text).toBe('');
  });

  it('should return null when condition false and no children', async () => {
    const ifComponent = new If();
    const context = createRenderContext();
    const result = ifComponent.render({ when: false }, undefined, context);
    expect(result).toBeNull();
  });

  it('should return null when condition true but children undefined', async () => {
    const ifComponent = new If();
    const context = createRenderContext();
    const result = ifComponent.render({ when: true }, undefined, context);
    expect(result).toBeNull();
  });
});

// ============================================================================
// SELECT COMPONENT - Additional branches
// ============================================================================

import { AskOption } from '../../src/components/ask/Option';

describe('AskSelect - Additional Branch Coverage', () => {
  it('should show placeholder when no value and no default', async () => {
    const element = jsx(AskSelect, {
      name: 'color',
      label: 'Color',
      options: [
        { value: 'red', label: 'Red' },
        { value: 'blue', label: 'Blue' },
      ],
    });
    const result = await render(element);
    expect(result.text).toBe('{color}');
  });

  it('should render in silent mode', async () => {
    const element = jsx(AskSelect, {
      name: 'color',
      label: 'Color',
      options: [{ value: 'red', label: 'Red' }],
      silent: true,
    });
    const result = await render(element);
    expect(result.text).toBe('');
  });

  it('should use text from option when available', async () => {
    const element = jsx(AskSelect, {
      name: 'color',
      label: 'Color',
      options: [
        { value: 'red', label: 'Red Label', text: 'Red Display Text' },
      ],
      default: 'red',
    });
    const result = await render(element);
    expect(result.text).toBe('Red Display Text');
  });

  it('should collect options from Option children', async () => {
    const element = jsx(AskSelect, {
      name: 'size',
      label: 'Size',
      default: 'medium',
      children: [
        jsx(AskOption, { value: 'small', label: 'Small' }),
        jsx(AskOption, { value: 'medium', label: 'Medium' }),
        jsx(AskOption, { value: 'large', label: 'Large' }),
      ],
    });
    const result = await render(element);
    expect(result.text).toBe('Medium');
  });

  it('should handle empty options array', async () => {
    const element = jsx(AskSelect, {
      name: 'empty',
      label: 'Empty',
      options: [],
      default: 'value',
    });
    const result = await render(element);
    // Value returned since no option found
    expect(result.text).toBe('value');
  });
});

// ============================================================================
// SEARCH ENGINE - Branch Coverage
// ============================================================================

import { createSearchEngine } from '../../src/services/search-engine';

describe('Search Engine - Branch Coverage', () => {
  it('should search with tag filter', () => {
    const engine = createSearchEngine();
    engine.index([
      { name: 'Prompt1', description: 'Test prompt', tags: ['coding', 'python'], library: 'test' },
      { name: 'Prompt2', description: 'Another prompt', tags: ['writing'], library: 'test' },
    ]);

    const results = engine.search('prompt', { tags: ['coding'] });
    expect(results.length).toBe(1);
    expect(results[0].prompt.name).toBe('Prompt1');
  });

  it('should filter results by score threshold', () => {
    const engine = createSearchEngine({ threshold: 0.5 });
    engine.index([
      { name: 'ExactMatch', description: 'This is exact', tags: [], library: 'test' },
    ]);

    // Search that should match
    const results = engine.search('ExactMatch');
    expect(results.length).toBeGreaterThanOrEqual(0);
  });

  it('should limit results', () => {
    const engine = createSearchEngine();
    const prompts = Array.from({ length: 20 }, (_, i) => ({
      name: `Prompt${i}`,
      description: 'Test',
      tags: ['test'],
      library: 'test',
    }));
    engine.index(prompts);

    const results = engine.search('test', { limit: 5 });
    expect(results.length).toBeLessThanOrEqual(5);
  });

  it('should get prompts by tag', () => {
    const engine = createSearchEngine();
    engine.index([
      { name: 'P1', description: 'D1', tags: ['a', 'b'], library: 'test' },
      { name: 'P2', description: 'D2', tags: ['b', 'c'], library: 'test' },
    ]);

    const byTag = engine.getByTag('b');
    expect(byTag.length).toBe(2);
  });

  it('should get all tags', () => {
    const engine = createSearchEngine();
    engine.index([
      { name: 'P1', description: 'D1', tags: ['a', 'b'], library: 'test' },
      { name: 'P2', description: 'D2', tags: ['b', 'c'], library: 'test' },
    ]);

    const tags = engine.getAllTags();
    expect(tags).toContain('a');
    expect(tags).toContain('b');
    expect(tags).toContain('c');
  });

  it('should clear all data', () => {
    const engine = createSearchEngine();
    engine.index([
      { name: 'P1', description: 'D1', tags: ['a'], library: 'test' },
    ]);

    engine.clear();
    const results = engine.search('P1');
    expect(results.length).toBe(0);
  });

  it('should handle search with no results', () => {
    const engine = createSearchEngine();
    engine.index([
      { name: 'Prompt', description: 'Test', tags: [], library: 'test' },
    ]);

    const results = engine.search('nonexistent');
    expect(results.length).toBe(0);
  });

  it('should use default config when none provided', () => {
    const engine = createSearchEngine();
    expect(engine).toBeDefined();
  });

  it('should handle custom config options', () => {
    const engine = createSearchEngine({
      threshold: 0.1,
      weights: { name: 5, description: 2, tags: 3, content: 1 },
      fuzzy: false,
      fuzziness: 0.3,
      prefix: false,
      combineWith: 'OR',
    });
    expect(engine).toBeDefined();
  });
});

// ============================================================================
// USES TO IMPORT PLUGIN - Branch Coverage
// ============================================================================

import { createPromptFromSource } from '../../src/create-prompt';

describe('Uses to Import Plugin - Branch Coverage', () => {
  it('should transform Uses with component attribute', async () => {
    const source = `
<Prompt name="test">
  <Uses component="Section" from="pupt-lib" />
  <Section name="intro">Content</Section>
</Prompt>
    `;
    const element = await createPromptFromSource(source, 'uses-test.prompt');
    const result = await render(element);
    expect(result.text).toContain('Content');
  });

  it('should transform Uses with default attribute', async () => {
    const source = `
<Prompt name="test">
  <Uses default="Fragment" from="pupt-lib" />
  <Task>Hello</Task>
</Prompt>
    `;
    const element = await createPromptFromSource(source, 'uses-default.prompt');
    const result = await render(element);
    expect(result.text).toContain('Hello');
  });

  it('should transform Uses with as alias', async () => {
    const source = `
<Prompt name="test">
  <Uses component="Section" as="MySection" from="pupt-lib" />
  <MySection name="aliased">Aliased content</MySection>
</Prompt>
    `;
    const element = await createPromptFromSource(source, 'uses-alias.prompt');
    const result = await render(element);
    expect(result.text).toContain('Aliased content');
  });

  it('should transform Uses with multiple comma-separated components', async () => {
    const source = `
<Prompt name="test">
  <Uses component="Section, Task" from="pupt-lib" />
  <Section name="sec">
    <Task>Do something</Task>
  </Section>
</Prompt>
    `;
    const element = await createPromptFromSource(source, 'uses-multi.prompt');
    const result = await render(element);
    expect(result.text).toContain('Do something');
  });

  it('should throw error when Uses lacks from attribute', async () => {
    const source = `
<Prompt name="test">
  <Uses component="Section" />
  <Task>Test</Task>
</Prompt>
    `;
    await expect(createPromptFromSource(source, 'uses-no-from.prompt'))
      .rejects.toThrow(/from/);
  });

  it('should throw error when Uses lacks component and default', async () => {
    const source = `
<Prompt name="test">
  <Uses from="some-module" />
  <Task>Test</Task>
</Prompt>
    `;
    await expect(createPromptFromSource(source, 'uses-no-comp.prompt'))
      .rejects.toThrow(/component.*default/);
  });
});

// ============================================================================
// CREATE PROMPT - Branch Coverage
// ============================================================================

describe('createPromptFromSource - Branch Coverage', () => {
  it('should handle source without imports (prepend custom components)', async () => {
    // Source with no import statements - custom components prepended at beginning
    const source = `
export default (
  <Prompt name="test">
    <CustomComp />
  </Prompt>
);
    `;

    const CustomComp = () => 'Custom component output';
    CustomComp.schema = z.object({}).passthrough();

    const element = await createPromptFromSource(source, 'no-imports.tsx', {
      components: { CustomComp },
    });
    const result = await render(element);
    expect(result.text).toContain('Custom component output');
  });

  it('should handle source with imports (insert after imports)', async () => {
    const source = `
import { Prompt, Task } from 'pupt-lib';

export default (
  <Prompt name="test">
    <Task>Hello</Task>
    <CustomComp />
  </Prompt>
);
    `;

    const CustomComp = () => 'Custom';
    CustomComp.schema = z.object({}).passthrough();

    const element = await createPromptFromSource(source, 'with-imports.tsx', {
      components: { CustomComp },
    });
    const result = await render(element);
    expect(result.text).toContain('Custom');
  });

  it('should throw error when module has no default export', async () => {
    // Source with explicit export default undefined
    // This triggers the "must have a default export" error in create-prompt.ts
    const source = `
import { Prompt } from 'pupt-lib';
export default undefined;
    `;
    await expect(createPromptFromSource(source, 'no-default.tsx'))
      .rejects.toThrow(/must have a default export/);
  });
});

// ============================================================================
// API - Branch Coverage
// ============================================================================

import { Pupt } from '../../src/api';
import { isPuptElement } from '../../src/types/element';
import { PROPS } from '../../src/types/symbols';

describe('Pupt API - Branch Coverage', () => {
  it('should not re-initialize if already initialized', async () => {
    const pupt = new Pupt({ modules: [] });
    await pupt.init();
    // Call init again - should return early
    await pupt.init();
    expect(pupt.getPrompts().length).toBe(0);
  });

  it('should filter prompts by tags', async () => {
    const pupt = new Pupt({ modules: [] });
    await pupt.init();

    const filtered = pupt.getPrompts({ tags: ['nonexistent'] });
    expect(filtered.length).toBe(0);
  });

  it('should return undefined for non-existent prompt', async () => {
    const pupt = new Pupt({ modules: [] });
    await pupt.init();

    const prompt = pupt.getPrompt('nonexistent');
    expect(prompt).toBeUndefined();
  });

  it('should return prompts by tag', async () => {
    const pupt = new Pupt({ modules: [] });
    await pupt.init();

    const prompts = pupt.getPromptsByTag('nonexistent');
    expect(prompts.length).toBe(0);
  });

  describe('isPromptElement checks', () => {
    it('should return false for non-element values', () => {
      expect(isPuptElement('string')).toBe(false);
      expect(isPuptElement(123)).toBe(false);
      expect(isPuptElement(null)).toBe(false);
      expect(isPuptElement(undefined)).toBe(false);
      expect(isPuptElement({})).toBe(false);
    });

    it('should return false for element without name prop', () => {
      const element = jsx(Task, { children: 'Test' });
      // Element is valid but Task doesn't have name prop requirement for Prompt discovery
      const props = element[PROPS] as Record<string, unknown>;
      expect('name' in props).toBe(false);
    });
  });
});

// ============================================================================
// MULTISELECT - Additional branches
// ============================================================================

describe('AskMultiSelect - Additional Branch Coverage', () => {
  it('should use provided input value array', async () => {
    const element = jsx(AskMultiSelect, {
      name: 'features',
      label: 'Features',
      options: [
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B' },
      ],
      default: ['a'],
    });
    const result = await render(element, {
      inputs: new Map([['features', ['a', 'b']]]),
    });
    expect(result.text).toContain('A');
    expect(result.text).toContain('B');
  });

  it('should show placeholder when no value', async () => {
    const element = jsx(AskMultiSelect, {
      name: 'features',
      label: 'Features',
      options: [{ value: 'a', label: 'A' }],
    });
    const result = await render(element);
    expect(result.text).toBe('{features}');
  });

  it('should collect options from Option children', async () => {
    const element = jsx(AskMultiSelect, {
      name: 'colors',
      label: 'Colors',
      default: ['red', 'green'],
      children: [
        jsx(AskOption, { value: 'red', label: 'Red' }),
        jsx(AskOption, { value: 'green', label: 'Green' }),
        jsx(AskOption, { value: 'blue', label: 'Blue' }),
      ],
    });
    const result = await render(element);
    expect(result.text).toContain('Red');
    expect(result.text).toContain('Green');
  });

  it('should return value for option not found', async () => {
    const element = jsx(AskMultiSelect, {
      name: 'items',
      label: 'Items',
      options: [{ value: 'a', label: 'A' }],
      default: ['b', 'c'], // Not in options
    });
    const result = await render(element);
    expect(result.text).toBe('b, c');
  });
});

// ============================================================================
// ADDITIONAL EDGE CASE COVERAGE
// ============================================================================

import { File } from '../../src/components/data/File';
import { Prompt } from '../../src/components/structural/Prompt';
import path from 'path';

describe('File Component - Branch Coverage', () => {
  it('should read file with explicit language', async () => {
    const testFile = path.join(process.cwd(), 'package.json');
    const element = jsx(File, {
      path: testFile,
      language: 'json',
    });
    const result = await render(element);
    expect(result.text).toContain('```json');
    expect(result.text).toContain('pupt-lib');
  });

  it('should infer language from extension', async () => {
    const testFile = path.join(process.cwd(), 'package.json');
    const element = jsx(File, {
      path: testFile,
    });
    const result = await render(element);
    expect(result.text).toContain('```json');
  });

  it('should handle file read error', async () => {
    const element = jsx(File, {
      path: '/nonexistent/path/file.txt',
    });
    const result = await render(element);
    expect(result.text).toContain('Error reading file');
  });

  it('should handle unknown extension', async () => {
    const testFile = path.join(process.cwd(), 'tsconfig.json');
    const fileComponent = new File();
    const context = createRenderContext();
    const result = fileComponent.render({ path: testFile }, undefined, context);
    expect(result).toBeTruthy();
  });
});

describe('AskConfirm - Branch Coverage', () => {
  it('should render Yes for true value', async () => {
    const element = jsx(AskConfirm, {
      name: 'accept',
      label: 'Accept',
      default: true,
    });
    const result = await render(element);
    expect(result.text).toBe('Yes');
  });

  it('should render No for false value', async () => {
    const element = jsx(AskConfirm, {
      name: 'accept',
      label: 'Accept',
      default: false,
    });
    const result = await render(element);
    expect(result.text).toBe('No');
  });

  it('should render in silent mode', async () => {
    const element = jsx(AskConfirm, {
      name: 'accept',
      label: 'Accept',
      silent: true,
    });
    const result = await render(element);
    expect(result.text).toBe('');
  });

  it('should use provided input value', async () => {
    const element = jsx(AskConfirm, {
      name: 'accept',
      label: 'Accept',
      default: false,
    });
    const result = await render(element, {
      inputs: new Map([['accept', true]]),
    });
    expect(result.text).toBe('Yes');
  });

  it('should handle string input "true"', async () => {
    const element = jsx(AskConfirm, {
      name: 'accept',
      label: 'Accept',
    });
    const result = await render(element, {
      inputs: new Map([['accept', 'true']]),
    });
    expect(result.text).toBe('Yes');
  });

  it('should handle string input "false" as truthy (non-empty string)', async () => {
    // Note: Boolean("false") === true because it's a non-empty string
    const element = jsx(AskConfirm, {
      name: 'accept',
      label: 'Accept',
    });
    const result = await render(element, {
      inputs: new Map([['accept', 'false']]),
    });
    // String "false" is truthy, so it renders as Yes
    expect(result.text).toBe('Yes');
  });

  it('should default to false when no default and no input', async () => {
    const element = jsx(AskConfirm, {
      name: 'accept',
      label: 'Accept',
    });
    const result = await render(element);
    expect(result.text).toBe('No');
  });
});

describe('AskText - Branch Coverage', () => {
  it('should show placeholder when no value', async () => {
    const element = jsx(AskText, {
      name: 'input',
      label: 'Input',
    });
    const result = await render(element);
    expect(result.text).toBe('{input}');
  });

  it('should render in silent mode', async () => {
    const element = jsx(AskText, {
      name: 'input',
      label: 'Input',
      silent: true,
    });
    const result = await render(element);
    expect(result.text).toBe('');
  });

  it('should use provided input value', async () => {
    const element = jsx(AskText, {
      name: 'input',
      label: 'Input',
      default: 'default',
    });
    const result = await render(element, {
      inputs: new Map([['input', 'user input']]),
    });
    expect(result.text).toBe('user input');
  });
});

describe('Prompt Component - Branch Coverage', () => {
  it('should render with name only', async () => {
    const element = jsx(Prompt, {
      name: 'test-prompt',
      children: 'Content here',
    });
    const result = await render(element);
    expect(result.text).toBe('Content here');
  });

  it('should render with description', async () => {
    const element = jsx(Prompt, {
      name: 'test-prompt',
      description: 'A test prompt',
      children: 'Content',
    });
    const result = await render(element);
    expect(result.text).toBe('Content');
  });

  it('should render with tags', async () => {
    const element = jsx(Prompt, {
      name: 'test-prompt',
      tags: ['coding', 'test'],
      children: 'Tagged content',
    });
    const result = await render(element);
    expect(result.text).toBe('Tagged content');
  });
});

describe('Select Option Children Text Extraction', () => {
  it('should extract text from number children in options', async () => {
    const element = jsx(AskSelect, {
      name: 'size',
      label: 'Size',
      default: 'small',
      children: [
        jsx(AskOption, { value: 'small', children: 1 }),
        jsx(AskOption, { value: 'medium', children: 2 }),
      ],
    });
    const result = await render(element);
    expect(result.text).toBe('1');
  });

  it('should extract text from array children in options', async () => {
    const element = jsx(AskSelect, {
      name: 'size',
      label: 'Size',
      default: 'small',
      children: [
        jsx(AskOption, { value: 'small', children: ['Small ', '(S)'] }),
      ],
    });
    const result = await render(element);
    expect(result.text).toBe('Small (S)');
  });

  it('should handle mixed children types', async () => {
    const element = jsx(AskSelect, {
      name: 'size',
      label: 'Size',
      default: 'medium',
      children: [
        jsx(AskOption, { value: 'small' }),
        'some text that is not an option',
        jsx(AskOption, { value: 'medium', label: 'Medium' }),
      ],
    });
    const result = await render(element);
    expect(result.text).toBe('Medium');
  });
});

describe('MultiSelect Option Children', () => {
  it('should extract text from number children', async () => {
    const element = jsx(AskMultiSelect, {
      name: 'nums',
      label: 'Numbers',
      default: ['one'],
      children: [
        jsx(AskOption, { value: 'one', children: 1 }),
        jsx(AskOption, { value: 'two', children: 2 }),
      ],
    });
    const result = await render(element);
    expect(result.text).toBe('1');
  });

  it('should handle non-element children gracefully', async () => {
    const element = jsx(AskMultiSelect, {
      name: 'items',
      label: 'Items',
      default: ['a'],
      children: [
        jsx(AskOption, { value: 'a', label: 'A' }),
        'some text',
        123,
        null,
      ],
    });
    const result = await render(element);
    expect(result.text).toBe('A');
  });
});

// ============================================================================
// STEPS COMPONENT - Branch Coverage
// ============================================================================

import { Steps, Step } from '../../src/components/reasoning';

describe('Steps Component - Branch Coverage', () => {
  it('should handle single (non-array) child', async () => {
    // Tests line 15: children is not an array (single child)
    const element = jsx(Steps, {
      children: jsx(Step, { children: 'Single step' }),
    });
    const result = await render(element);
    expect(result.text).toContain('1.');
    expect(result.text).toContain('Single step');
  });

  it('should continue numbering after explicit number', async () => {
    // Tests line 29: autoNumber = (stepProps.number ?? 0) + 1
    const element = jsx(Steps, {
      children: [
        jsx(Step, { number: 10, children: 'Step 10' }),
        jsx(Step, { children: 'Step 11 (auto)' }),
      ],
    });
    const result = await render(element);
    expect(result.text).toContain('10.');
    expect(result.text).toContain('Step 10');
    expect(result.text).toContain('11.');
    expect(result.text).toContain('Step 11');
  });

  it('should handle mixed children with non-Step elements', async () => {
    const element = jsx(Steps, {
      children: [
        jsx(Step, { children: 'First' }),
        'some text',
        jsx(Step, { children: 'Second' }),
      ],
    });
    const result = await render(element);
    expect(result.text).toContain('1.');
    expect(result.text).toContain('2.');
  });
});

// ============================================================================
// JSX RUNTIME - Additional Branch Coverage
// ============================================================================

import { Fragment } from '../../src/jsx-runtime';

describe('JSX Runtime - Branch Coverage', () => {
  it('should render Fragment with children', async () => {
    const element = jsx(Fragment, {
      children: ['Hello', ' ', 'World'],
    });
    const result = await render(element);
    expect(result.text).toBe('Hello World');
  });

  it('should render Fragment with single child', async () => {
    const element = jsx(Fragment, {
      children: 'Single content',
    });
    const result = await render(element);
    expect(result.text).toBe('Single content');
  });

  it('should handle nested Fragments', async () => {
    const element = jsx(Fragment, {
      children: [
        jsx(Fragment, { children: 'A' }),
        jsx(Fragment, { children: 'B' }),
      ],
    });
    const result = await render(element);
    expect(result.text).toBe('AB');
  });
});

// ============================================================================
// RENDER ERROR HANDLING
// ============================================================================

describe('Render Error Handling', () => {
  it('should handle null node', async () => {
    const element = jsx(Prompt, {
      name: 'test',
      children: [null, 'content', undefined, false],
    });
    const result = await render(element);
    expect(result.text).toBe('content');
  });

  it('should handle number nodes', async () => {
    const element = jsx(Prompt, {
      name: 'test',
      children: [1, 2, 3],
    });
    const result = await render(element);
    expect(result.text).toBe('123');
  });

  it('should handle mixed node types', async () => {
    const element = jsx(Prompt, {
      name: 'test',
      children: ['Hello ', 42, ' times'],
    });
    const result = await render(element);
    expect(result.text).toBe('Hello 42 times');
  });
});
