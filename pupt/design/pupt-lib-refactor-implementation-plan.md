# Implementation Plan for pupt-lib Refactoring (Phase 1: Non-Breaking Dual-Mode Support)

## Overview

This plan implements Phase 1 of the pupt-lib refactoring: adding pupt-lib as a prompt rendering backend alongside the existing Handlebars engine. After this work, pupt will support three prompt formats simultaneously:

- **Handlebars** (`.md`) — existing format, unchanged
- **Build-time JSX** (`.tsx`/`.jsx`) — imported as ES modules via pupt-lib
- **Runtime JSX** (`.prompt`) — parsed at runtime via pupt-lib's `createPromptFromSource()`

All existing functionality continues to work unchanged. New pupt-lib features are additive.

### Prerequisites

- **pupt-lib v1.0.1** is published and fully implemented (verified)
- `createPromptFromSource()` and `createPrompt()` exist in pupt-lib's `src/create-prompt.ts` but are **not exported** from `src/index.ts` — this must be fixed in pupt-lib before Phase 4 of this plan

### Key Design Decisions

1. **Non-breaking**: Every phase preserves backward compatibility. Existing `.md` prompts, configs, and history entries work without changes.
2. **Unified interface**: A `UnifiedPrompt` type wraps both legacy Handlebars prompts and pupt-lib prompts behind a common interface.
3. **Incremental adoption**: Users can mix `.md` and `.tsx`/`.prompt` files in the same prompt directory.
4. **Test-first**: Each phase specifies tests before implementation.

---

## Phase Breakdown

### Phase 1: Add pupt-lib Dependency and Config Schema Updates

**Objective**: Install pupt-lib, extend the config schema to support new fields (`libraries`, `targetLlm`), add config migration from v4 to v5, and create the prompt format detection utility.

**Tests to Write First**:

- `test/config/config-schema-v5.test.ts`: Validate new config schema fields
  ```typescript
  describe('Config Schema v5', () => {
    it('should accept config with libraries array', () => {
      const config = {
        version: '5.0.0',
        promptDirs: ['./prompts'],
        libraries: ['@company/prompts'],
      };
      expect(() => ConfigSchema.parse(config)).not.toThrow();
    });

    it('should accept config with targetLlm string', () => {
      const config = {
        version: '5.0.0',
        promptDirs: ['./prompts'],
        targetLlm: 'claude',
      };
      expect(() => ConfigSchema.parse(config)).not.toThrow();
    });

    it('should accept config without new fields (backward compat)', () => {
      const config = {
        version: '4.0.0',
        promptDirs: ['./prompts'],
      };
      expect(() => ConfigSchema.parse(config)).not.toThrow();
    });
  });
  ```

- `test/config/migration-v5.test.ts`: Test v4 → v5 migration
  ```typescript
  describe('Config Migration v4 → v5', () => {
    it('should migrate v4 config to v5 by adding version field', () => {
      const v4Config = {
        version: '4.0.0',
        promptDirs: ['./prompts'],
        handlebarsExtensions: [{ type: 'file', path: './helpers.js' }],
      };
      const migrated = migrateConfig(v4Config);
      expect(migrated.version).toBe('5.0.0');
    });

    it('should preserve existing fields during migration', () => {
      const v4Config = {
        version: '4.0.0',
        promptDirs: ['./prompts'],
        historyDir: '~/.pt-history',
        defaultCmd: 'claude',
      };
      const migrated = migrateConfig(v4Config);
      expect(migrated.promptDirs).toEqual(['./prompts']);
      expect(migrated.historyDir).toBe('~/.pt-history');
      expect(migrated.defaultCmd).toBe('claude');
    });

    it('should add empty libraries array as default', () => {
      const migrated = migrateConfig({ version: '4.0.0', promptDirs: ['./prompts'] });
      expect(migrated.libraries).toEqual([]);
    });

    it('should detect v4 config needs migration', () => {
      expect(migrateConfig.needsMigration({ version: '4.0.0', promptDirs: ['./prompts'] })).toBe(true);
    });

    it('should not migrate v5 config', () => {
      expect(migrateConfig.needsMigration({ version: '5.0.0', promptDirs: ['./prompts'] })).toBe(false);
    });
  });
  ```

- `test/utils/prompt-format.test.ts`: Test format detection
  ```typescript
  describe('detectPromptFormat', () => {
    it('should detect .md as handlebars', () => {
      expect(detectPromptFormat('review.md')).toBe('handlebars');
    });

    it('should detect .tsx as jsx', () => {
      expect(detectPromptFormat('review.tsx')).toBe('jsx');
    });

    it('should detect .jsx as jsx', () => {
      expect(detectPromptFormat('review.jsx')).toBe('jsx');
    });

    it('should detect .prompt as jsx-runtime', () => {
      expect(detectPromptFormat('review.prompt')).toBe('jsx-runtime');
    });

    it('should default to handlebars for unknown extensions', () => {
      expect(detectPromptFormat('review.txt')).toBe('handlebars');
    });
  });
  ```

**Implementation**:

- `src/types/config.ts`: Add new fields to Config interface
  ```typescript
  export interface Config {
    // ... existing fields ...
    libraries?: string[];   // npm packages providing pupt-lib prompts
    targetLlm?: string;     // target LLM for environment context (e.g., "claude")
  }
  ```

- `src/schemas/config-schema.ts`: Add new fields to Zod schema
  ```typescript
  // Add to ConfigSchema:
  libraries: z.array(z.string()).optional(),
  targetLlm: z.string().optional(),

  // Add ConfigV5Schema alongside existing V1/V2 schemas
  ```

- `src/config/migration.ts`: Add v5 migration to migrations array
  ```typescript
  {
    version: '5.0.0',
    migrate: (config) => {
      const migrated = { ...config };
      migrated.version = '5.0.0';
      migrated.libraries = migrated.libraries ?? [];
      return migrated;
    }
  }
  ```

- `src/utils/prompt-format.ts`: New file — format detection utility
  ```typescript
  export type PromptFormat = 'handlebars' | 'jsx' | 'jsx-runtime';

  export function detectPromptFormat(filePath: string): PromptFormat {
    if (filePath.endsWith('.tsx') || filePath.endsWith('.jsx')) return 'jsx';
    if (filePath.endsWith('.prompt')) return 'jsx-runtime';
    return 'handlebars';
  }
  ```

**Dependencies**:
- External: `pupt-lib@^1.0.1` (add to package.json dependencies)
- Internal: none (first phase)

**Verification**:
1. Run: `npm test test/config/config-schema-v5.test.ts test/config/migration-v5.test.ts test/utils/prompt-format.test.ts`
2. Expected: All new tests pass
3. Run: `npm test` (full suite)
4. Expected: All existing tests still pass (no regressions)
5. Manual: Create a `.pt-config.json` with `"libraries": ["@company/prompts"]` and confirm `pt config` shows the new field without errors

---

### Phase 2: UnifiedPrompt Type and Prompt Discovery Service

**Objective**: Create the `UnifiedPrompt` type that wraps both legacy Handlebars prompts and pupt-lib `DiscoveredPromptWithMethods` behind a common interface. Create a `UnifiedPromptService` that discovers prompts from both Handlebars directories and pupt-lib modules, and returns them as `UnifiedPrompt[]`.

**Tests to Write First**:

- `test/types/unified-prompt.test.ts`: Validate type compatibility
  ```typescript
  describe('UnifiedPrompt', () => {
    it('should represent a Handlebars prompt', () => {
      const prompt: UnifiedPrompt = {
        name: 'code-review',
        description: 'Review code',
        tags: ['code'],
        source: './prompts',
        filePath: './prompts/code-review.md',
        format: 'handlebars',
        content: '# Review\n{{input code "Paste code"}}',
        frontmatter: { title: 'code-review' },
        variables: [{ name: 'code', type: 'input' }],
      };
      expect(prompt.format).toBe('handlebars');
      expect(prompt.puptLibPrompt).toBeUndefined();
    });

    it('should represent a pupt-lib JSX prompt', () => {
      const mockPuptLibPrompt = { name: 'test', render: vi.fn(), getInputIterator: vi.fn() };
      const prompt: UnifiedPrompt = {
        name: 'test',
        description: 'A test prompt',
        tags: ['test'],
        source: '@acme/prompts',
        format: 'jsx',
        puptLibPrompt: mockPuptLibPrompt as any,
      };
      expect(prompt.format).toBe('jsx');
      expect(prompt.puptLibPrompt).toBeDefined();
    });
  });
  ```

- `test/services/unified-prompt-service.test.ts`: Service discovery logic
  ```typescript
  describe('UnifiedPromptService', () => {
    it('should discover Handlebars prompts from promptDirs', async () => {
      // Set up temp dir with a .md file
      const service = new UnifiedPromptService({ promptDirs: [tempDir] });
      const prompts = await service.discoverAll();
      expect(prompts.some(p => p.format === 'handlebars')).toBe(true);
    });

    it('should discover .prompt files from promptDirs', async () => {
      // Set up temp dir with a .prompt file
      const service = new UnifiedPromptService({ promptDirs: [tempDir] });
      const prompts = await service.discoverAll();
      expect(prompts.some(p => p.format === 'jsx-runtime')).toBe(true);
    });

    it('should discover .tsx files from promptDirs', async () => {
      // Set up temp dir with a .tsx file
      const service = new UnifiedPromptService({ promptDirs: [tempDir] });
      const prompts = await service.discoverAll();
      expect(prompts.some(p => p.format === 'jsx')).toBe(true);
    });

    it('should return empty array when no prompts found', async () => {
      const service = new UnifiedPromptService({ promptDirs: ['/nonexistent'] });
      const prompts = await service.discoverAll();
      expect(prompts).toEqual([]);
    });

    it('should discover prompts from pupt-lib libraries', async () => {
      // This test uses a mock Pupt instance
      const service = new UnifiedPromptService({ promptDirs: [], libraries: ['mock-lib'] });
      // Mock Pupt.init() and Pupt.getPrompts()
      const prompts = await service.discoverAll();
      expect(prompts.some(p => p.format === 'jsx')).toBe(true);
    });

    it('should search across both Handlebars and pupt-lib prompts', async () => {
      const service = new UnifiedPromptService({ promptDirs: [tempDir] });
      await service.discoverAll();
      const results = service.search('review');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should find a prompt by name', async () => {
      const service = new UnifiedPromptService({ promptDirs: [tempDir] });
      await service.discoverAll();
      const prompt = service.findByName('code-review');
      expect(prompt).toBeDefined();
      expect(prompt!.name).toBe('code-review');
    });
  });
  ```

**Implementation**:

- `src/types/unified-prompt.ts`: New file — the unified type
  ```typescript
  import type { Prompt, VariableDefinition } from './prompt.js';
  import type { DiscoveredPromptWithMethods } from 'pupt-lib';

  export type PromptFormat = 'handlebars' | 'jsx' | 'jsx-runtime';

  export interface UnifiedPrompt {
    // Common fields
    name: string;
    description?: string;
    tags: string[];
    source: string;        // origin: directory path or npm package name
    filePath?: string;      // filesystem path (if local)
    format: PromptFormat;

    // pupt-lib prompt (jsx and jsx-runtime formats)
    puptLibPrompt?: DiscoveredPromptWithMethods;

    // Handlebars-specific (legacy)
    content?: string;
    frontmatter?: Record<string, unknown>;
    variables?: VariableDefinition[];

    // Original Prompt object (for backward compat with existing code)
    legacyPrompt?: Prompt;
  }
  ```

- `src/services/unified-prompt-service.ts`: New file — unified discovery
  ```typescript
  // Discovers prompts from:
  // 1. promptDirs (scans for .md, .tsx, .jsx, .prompt files)
  // 2. libraries (uses Pupt class from pupt-lib)
  //
  // For .md files: wraps with PromptManager (existing code)
  // For .tsx/.jsx files: uses createPrompt() from pupt-lib
  // For .prompt files: uses createPromptFromSource() from pupt-lib
  // For libraries: uses Pupt.init() + Pupt.getPrompts()
  //
  // Returns UnifiedPrompt[] for all discovered prompts
  // Provides search() and findByName() methods
  ```

**Dependencies**:
- External: `pupt-lib` (already added in Phase 1)
- Internal: Phase 1 (config schema, format detection)

**Verification**:
1. Run: `npm test test/types/unified-prompt.test.ts test/services/unified-prompt-service.test.ts`
2. Expected: All new tests pass
3. Run: `npm test` (full suite)
4. Expected: No regressions
5. Manual: Place a `.prompt` file in your prompts directory alongside existing `.md` files. Run `pt run` and verify both formats appear in the interactive search list. Example `.prompt` file:
   ```jsx
   <Prompt name="hello-world" description="A simple greeting prompt" tags={["test"]}>
     <Role>You are a friendly assistant.</Role>
     <Task>Say hello to the user.</Task>
   </Prompt>
   ```

---

### Phase 3: Input Adapter for Inquirer

**Objective**: Create an input adapter that translates pupt-lib `InputRequirement` objects into Inquirer prompts. This bridges pupt-lib's input collection system with pupt's existing interactive UI (Inquirer.js). The adapter handles all input types: text, number, select, multiselect, confirm, editor, secret, file, path, date, rating.

**Tests to Write First**:

- `test/services/input-adapter.test.ts`: Adapter behavior
  ```typescript
  describe('InputAdapter', () => {
    it('should prompt for text input', async () => {
      const req: InputRequirement = {
        name: 'username',
        type: 'text',
        label: 'Enter your username',
        required: true,
      };
      // Mock @inquirer/prompts input()
      vi.mocked(inquirerInput).mockResolvedValue('alice');
      const result = await askUser(req);
      expect(result).toBe('alice');
    });

    it('should prompt for select input', async () => {
      const req: InputRequirement = {
        name: 'language',
        type: 'select',
        label: 'Choose a language',
        options: [
          { value: 'typescript', label: 'TypeScript' },
          { value: 'python', label: 'Python' },
        ],
      };
      vi.mocked(inquirerSelect).mockResolvedValue('typescript');
      const result = await askUser(req);
      expect(result).toBe('typescript');
    });

    it('should prompt for confirm input', async () => {
      const req: InputRequirement = {
        name: 'proceed',
        type: 'confirm',
        label: 'Continue?',
      };
      vi.mocked(inquirerConfirm).mockResolvedValue(true);
      const result = await askUser(req);
      expect(result).toBe(true);
    });

    it('should prompt for secret input', async () => {
      const req: InputRequirement = {
        name: 'token',
        type: 'secret',
        label: 'API token',
      };
      vi.mocked(inquirerPassword).mockResolvedValue('abc123');
      const result = await askUser(req);
      expect(result).toBe('abc123');
    });

    it('should prompt for editor input', async () => {
      const req: InputRequirement = {
        name: 'code',
        type: 'editor',
        label: 'Paste code',
      };
      vi.mocked(inquirerEditor).mockResolvedValue('console.log("hi")');
      const result = await askUser(req);
      expect(result).toBe('console.log("hi")');
    });

    it('should display previous validation error message', async () => {
      const consoleSpy = vi.spyOn(console, 'error');
      const req: InputRequirement = { name: 'x', type: 'text', label: 'X' };
      vi.mocked(inquirerInput).mockResolvedValue('valid');
      await askUser(req, 'Previous value was invalid');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Previous value was invalid'));
    });

    it('should handle number input', async () => {
      const req: InputRequirement = {
        name: 'count',
        type: 'number',
        label: 'How many?',
      };
      vi.mocked(inquirerNumber).mockResolvedValue(42);
      const result = await askUser(req);
      expect(result).toBe(42);
    });

    it('should handle multiselect input', async () => {
      const req: InputRequirement = {
        name: 'features',
        type: 'multiselect',
        label: 'Select features',
        options: [
          { value: 'auth', label: 'Authentication' },
          { value: 'logs', label: 'Logging' },
        ],
      };
      vi.mocked(inquirerCheckbox).mockResolvedValue(['auth', 'logs']);
      const result = await askUser(req);
      expect(result).toEqual(['auth', 'logs']);
    });

    it('should throw for unsupported input type', async () => {
      const req = { name: 'x', type: 'unknown', label: 'X' } as any;
      await expect(askUser(req)).rejects.toThrow('Unsupported input type');
    });
  });
  ```

**Implementation**:

- `src/services/input-adapter.ts`: New file — Inquirer adapter
  ```typescript
  import type { InputRequirement } from 'pupt-lib';
  import { input, select, confirm, editor, password, checkbox, number } from '@inquirer/prompts';

  export async function askUser(
    req: InputRequirement,
    previousError?: string,
  ): Promise<unknown> {
    if (previousError) {
      console.error(chalk.red(`Error: ${previousError}`));
    }

    switch (req.type) {
      case 'text':    return askText(req);
      case 'number':  return askNumber(req);
      case 'select':  return askSelect(req);
      case 'multiselect': return askMultiSelect(req);
      case 'confirm': return askConfirm(req);
      case 'editor':  return askEditor(req);
      case 'secret':  return askPassword(req);
      case 'file':
      case 'path':    return askFile(req);
      case 'date':    return askDate(req);
      case 'rating':  return askRating(req);
      case 'choice':  return askSelect(req);  // alias
      default:
        throw new Error(`Unsupported input type: ${req.type}`);
    }
  }
  ```

**Dependencies**:
- External: `pupt-lib` (for InputRequirement type), `@inquirer/prompts` (already a dependency)
- Internal: none (standalone utility)

**Verification**:
1. Run: `npm test test/services/input-adapter.test.ts`
2. Expected: All tests pass
3. Run: `npm test` (full suite)
4. Expected: No regressions
5. Manual: Not directly user-testable yet (will be integrated in Phase 5)

---

### Phase 4: Post-Execution Handler and pupt-lib Export Fix

**Objective**: Create the post-execution handler that processes pupt-lib `PostExecutionAction[]` (reviewFile, openUrl, runCommand). Also address the `createPromptFromSource` / `createPrompt` export gap in pupt-lib.

**Tests to Write First**:

- `test/services/post-execution-handler.test.ts`: Handler behavior
  ```typescript
  describe('PostExecutionHandler', () => {
    it('should open file for reviewFile action', async () => {
      const editorSpy = vi.spyOn(editorLauncher, 'openInEditor');
      await handlePostExecution(
        [{ type: 'reviewFile', file: '/tmp/review.md' }],
        { isAutoRun: false, noInteractive: false }
      );
      expect(editorSpy).toHaveBeenCalledWith(expect.any(String), '/tmp/review.md');
    });

    it('should skip reviewFile in non-interactive mode', async () => {
      const editorSpy = vi.spyOn(editorLauncher, 'openInEditor');
      await handlePostExecution(
        [{ type: 'reviewFile', file: '/tmp/review.md' }],
        { isAutoRun: false, noInteractive: true }
      );
      expect(editorSpy).not.toHaveBeenCalled();
    });

    it('should handle openUrl action', async () => {
      const openSpy = vi.fn();
      // mock open module
      await handlePostExecution(
        [{ type: 'openUrl', url: 'https://example.com' }],
        {}
      );
      expect(openSpy).toHaveBeenCalledWith('https://example.com');
    });

    it('should handle runCommand action', async () => {
      const execSpy = vi.fn().mockResolvedValue({ stdout: '' });
      await handlePostExecution(
        [{ type: 'runCommand', command: 'echo hello' }],
        {}
      );
      expect(execSpy).toHaveBeenCalledWith('echo hello');
    });

    it('should handle empty actions array', async () => {
      await expect(handlePostExecution([], {})).resolves.not.toThrow();
    });

    it('should process multiple actions in order', async () => {
      const order: string[] = [];
      // Mock handlers to track order
      await handlePostExecution(
        [
          { type: 'runCommand', command: 'echo 1' },
          { type: 'openUrl', url: 'https://example.com' },
        ],
        {}
      );
      expect(order).toEqual(['runCommand', 'openUrl']);
    });
  });
  ```

**Implementation**:

- `src/services/post-execution-handler.ts`: New file
  ```typescript
  import type { PostExecutionAction } from 'pupt-lib';
  import { editorLauncher } from '../utils/editor.js';
  import { execa } from 'execa';
  import chalk from 'chalk';
  import { logger } from '../utils/logger.js';

  export interface PostExecutionOptions {
    isAutoRun?: boolean;
    noInteractive?: boolean;
  }

  export async function handlePostExecution(
    actions: PostExecutionAction[],
    options: PostExecutionOptions,
  ): Promise<void> {
    for (const action of actions) {
      switch (action.type) {
        case 'reviewFile':
          await handleReviewFile(action.file, options);
          break;
        case 'openUrl':
          await handleOpenUrl(action.url);
          break;
        case 'runCommand':
          await handleRunCommand(action.command);
          break;
      }
    }
  }
  ```

- **pupt-lib fix** (prerequisite): Export `createPromptFromSource` and `createPrompt` from `pupt-lib/src/index.ts`. This is a separate task on the pupt-lib repo:
  ```typescript
  // Add to pupt-lib src/index.ts:
  export { createPromptFromSource, createPrompt } from './create-prompt';
  export type { CreatePromptOptions } from './create-prompt';
  ```

**Dependencies**:
- External: `pupt-lib` (for `PostExecutionAction` type), `execa` (already a dependency)
- Internal: `src/utils/editor.ts` (existing file)

**Verification**:
1. Run: `npm test test/services/post-execution-handler.test.ts`
2. Expected: All tests pass
3. Run: `npm test` (full suite)
4. Expected: No regressions
5. Manual: Not directly user-testable yet (will be integrated in Phase 5)

---

### Phase 5: Refactor Run Command for Dual-Mode Execution

**Objective**: Update the `run` command to use `UnifiedPromptService` for prompt discovery, and branch execution based on prompt format: Handlebars prompts use the existing `TemplateEngine`, while pupt-lib prompts use the `InputIterator` + `askUser()` + `render()` pipeline. Post-execution actions are handled by the new handler.

This is the critical integration phase that makes the new prompt formats usable via `pt run`.

**Tests to Write First**:

- `test/commands/run-unified.test.ts`: Dual-mode run tests
  ```typescript
  describe('Run Command (Unified)', () => {
    describe('Handlebars prompt execution', () => {
      it('should process .md prompts using TemplateEngine (unchanged behavior)', async () => {
        // Mock UnifiedPromptService to return a handlebars prompt
        // Mock TemplateEngine.processTemplate
        // Verify TemplateEngine was called
        await runCommand(['claude'], { promptName: 'legacy-review' });
        expect(TemplateEngine.prototype.processTemplate).toHaveBeenCalled();
      });
    });

    describe('pupt-lib prompt execution', () => {
      it('should process .tsx prompts using pupt-lib render', async () => {
        // Mock UnifiedPromptService to return a jsx prompt with puptLibPrompt
        // Mock InputIterator
        // Verify puptLibPrompt.render() was called
        await runCommand(['claude'], { promptName: 'jsx-review' });
        expect(mockPuptLibPrompt.render).toHaveBeenCalled();
      });

      it('should collect inputs using InputIterator and askUser', async () => {
        // Mock iterator to return one text requirement
        // Mock askUser to return a value
        // Verify submit() and advance() were called
      });

      it('should skip input collection in noInteractive mode', async () => {
        // Mock iterator with runNonInteractive
        await runCommand(['claude'], { promptName: 'jsx-review', noInteractive: true });
        expect(mockIterator.runNonInteractive).toHaveBeenCalled();
      });

      it('should pre-supply values from --var flags', async () => {
        // Verify that pre-supplied values skip the input prompt
      });

      it('should handle post-execution actions from render result', async () => {
        // Mock render to return postExecution actions
        // Verify handlePostExecution was called
      });

      it('should handle validation retry loop', async () => {
        // Mock iterator.submit to fail first, then succeed
        // Verify askUser is called twice
      });
    });

    describe('backward compatibility', () => {
      it('should work with history rerun', async () => {
        // Existing history rerun should work unchanged
      });

      it('should work with --prompt option for .md files', async () => {
        // Direct prompt string should work unchanged
      });

      it('should save history for pupt-lib prompts', async () => {
        // Verify history is saved with new format fields
      });
    });
  });
  ```

**Implementation**:

- `src/commands/run.ts`: Modify existing file to add pupt-lib execution path
  ```typescript
  // Key changes:
  // 1. Replace direct PromptManager usage with UnifiedPromptService
  // 2. Add format-based branching after prompt selection:
  //    - format === 'handlebars': use TemplateEngine (existing code, moved into function)
  //    - format === 'jsx' or 'jsx-runtime': use InputIterator + askUser + render
  // 3. Use handlePostExecution() for pupt-lib post-execution actions
  // 4. Update templateInfo construction for history saving

  async function processHandlebarsPrompt(prompt: UnifiedPrompt, config: Config, configDir?: string, noInteractive?: boolean) {
    // Existing TemplateEngine logic, extracted from current runCommand
  }

  async function processPuptLibPrompt(prompt: UnifiedPrompt, options: RunOptions, config: Config) {
    const puptPrompt = prompt.puptLibPrompt!;
    const iterator = puptPrompt.getInputIterator();
    iterator.start();

    if (options.noInteractive) {
      await iterator.runNonInteractive();
    } else {
      while (!iterator.isDone()) {
        const req = iterator.current();
        if (!req) break;
        // Pre-supplied values from --var flags
        // ... interactive collection with askUser()
      }
    }

    const inputs = iterator.getValues();
    const env = createEnvironment({ llm: { model: config.targetLlm ?? 'claude' } });
    const result = puptPrompt.render({ inputs, env });

    return { text: result.text, postExecution: result.postExecution, inputs };
  }
  ```

**Dependencies**:
- External: `pupt-lib` (Pupt, createEnvironment, InputIterator types)
- Internal: Phase 2 (UnifiedPromptService), Phase 3 (input adapter), Phase 4 (post-execution handler)

**Verification**:
1. Run: `npm test test/commands/run-unified.test.ts`
2. Expected: All tests pass
3. Run: `npm test` (full suite)
4. Expected: All existing run tests still pass
5. Manual verification — create a `.prompt` file:
   ```jsx
   <Prompt name="greet" description="Greeting prompt" tags={["test"]}>
     <Ask.Text name="name" label="What is your name?" />
     <Role>You are a friendly assistant.</Role>
     <Task>Greet {inputs.name} warmly.</Task>
   </Prompt>
   ```
   Then run `pt run` — the prompt should appear in search, ask for the name interactively, and produce rendered output. Also run `pt run --no-input` with a prompt that has defaults and confirm it renders without interaction.

---

### Phase 6: Update Interactive Search and List Commands

**Objective**: Update the `InteractiveSearch` UI to display `UnifiedPrompt` objects (showing format badges, library sources, etc.). Wire up any list/search-related commands to use `UnifiedPromptService`. Existing prompts display unchanged; new prompts show additional metadata.

**Tests to Write First**:

- `test/ui/interactive-search-unified.test.ts`: Unified search display
  ```typescript
  describe('InteractiveSearch (Unified)', () => {
    it('should display handlebars prompts with existing format', () => {
      const display = formatUnifiedPromptDisplay(handlebarsPrompt);
      expect(display).toContain('code-review');
    });

    it('should display pupt-lib prompts with source info', () => {
      const display = formatUnifiedPromptDisplay(jsxPrompt);
      expect(display).toContain('code-review');
      expect(display).toContain('@acme/prompts');  // source library
    });

    it('should display format indicator for non-handlebars prompts', () => {
      const display = formatUnifiedPromptDisplay(jsxPrompt);
      expect(display).toContain('jsx');
    });

    it('should search across all prompt formats', async () => {
      const search = new UnifiedInteractiveSearch();
      // Mock with both handlebars and jsx prompts
      const results = search.filter('review');
      expect(results.length).toBeGreaterThan(0);
    });
  });
  ```

**Implementation**:

- `src/ui/interactive-search.ts`: Update to accept `UnifiedPrompt[]`
  ```typescript
  // Add new method that works with UnifiedPrompt
  // Keep existing selectPrompt() for backward compatibility
  async selectUnifiedPrompt(prompts: UnifiedPrompt[]): Promise<UnifiedPrompt> {
    // Uses UnifiedPromptService.search() instead of local SearchEngine
    // Displays format badge [md], [jsx], [prompt]
    // Shows library source for npm-sourced prompts
  }
  ```

- `src/commands/run.ts`: Update prompt selection to use `selectUnifiedPrompt()`

**Dependencies**:
- Internal: Phase 2 (UnifiedPromptService, UnifiedPrompt type), Phase 5 (run command refactor)

**Verification**:
1. Run: `npm test test/ui/interactive-search-unified.test.ts`
2. Expected: All tests pass
3. Run: `npm test` (full suite)
4. Expected: No regressions
5. Manual: Run `pt run` with a mix of `.md` and `.prompt` files in the same prompt directory. Verify:
   - Both formats appear in the search results
   - Handlebars prompts show as before
   - JSX prompts show a format indicator and library source (if from a library)
   - Selecting either format works end-to-end

---

### Phase 7: Update History Format and Integration Tests

**Objective**: Update the history entry format to support pupt-lib prompt metadata (promptId, promptSource, promptVersion, promptTags). Ensure old history entries remain readable. Add integration tests that exercise the full flow from prompt discovery through execution to history saving.

**Tests to Write First**:

- `test/history/unified-history.test.ts`: History format updates
  ```typescript
  describe('History (Unified)', () => {
    it('should save history for Handlebars prompts with existing format', async () => {
      const entry = await historyManager.savePrompt(handlebarsTemplateInfo);
      const loaded = await historyManager.getHistoryEntry(1);
      expect(loaded!.templatePath).toBeDefined();
      expect(loaded!.templateContent).toBeDefined();
    });

    it('should save history for pupt-lib prompts with new fields', async () => {
      const entry = await historyManager.savePrompt({
        ...baseTemplateInfo,
        promptId: '@acme/prompts:code-review',
        promptSource: '@acme/prompts',
        promptVersion: '1.0.0',
        promptTags: ['code', 'review'],
      });
      const loaded = await historyManager.getHistoryEntry(1);
      expect(loaded!.promptId).toBe('@acme/prompts:code-review');
      expect(loaded!.promptSource).toBe('@acme/prompts');
    });

    it('should read old history entries without new fields', async () => {
      // Write a legacy history entry directly
      // Read it back and verify no errors
    });

    it('should handle templateContent being undefined for JSX prompts', async () => {
      // JSX prompts can't serialize their template content
      const entry = await historyManager.savePrompt({
        ...baseTemplateInfo,
        templateContent: undefined,
        promptId: 'test:greeting',
      });
      const loaded = await historyManager.getHistoryEntry(1);
      expect(loaded).toBeDefined();
    });
  });
  ```

- `test/integration/unified-run.test.ts`: End-to-end integration
  ```typescript
  describe('Integration: Unified Run', () => {
    it('should run a .md prompt end-to-end', async () => {
      // Create temp dir with .pt-config.json and .md prompt
      // Run pt run --no-input
      // Verify output and history entry
    });

    it('should run a .prompt file end-to-end', async () => {
      // Create temp dir with .pt-config.json and .prompt file
      // The .prompt file has no required inputs (or has defaults)
      // Run pt run --no-input
      // Verify rendered output contains expected text
    });

    it('should mix .md and .prompt files in same directory', async () => {
      // Create temp dir with both formats
      // Discover all prompts
      // Verify both are found
    });
  });
  ```

**Implementation**:

- `src/types/history.ts`: Add optional pupt-lib fields
  ```typescript
  export interface HistoryEntry {
    // ... existing fields ...

    // New optional fields for pupt-lib prompts
    promptId?: string;           // e.g., "@acme/prompts:code-review"
    promptSource?: string;       // npm package or local path
    promptVersion?: string;      // from <Prompt version="...">
    promptTags?: string[];       // from <Prompt tags={[...]}>
    promptFormat?: string;       // 'handlebars' | 'jsx' | 'jsx-runtime'
  }
  ```

- `src/history/history-manager.ts`: Update `savePrompt()` to handle new fields
  ```typescript
  // Accept new fields in the save input
  // Write them to the JSON history file
  // Reading is already flexible (JSON parse), so old entries work as-is
  ```

- `src/commands/run.ts`: Pass new fields when saving history for pupt-lib prompts

**Dependencies**:
- Internal: Phase 2 (UnifiedPrompt), Phase 5 (run command refactor)

**Verification**:
1. Run: `npm test test/history/unified-history.test.ts test/integration/unified-run.test.ts`
2. Expected: All tests pass
3. Run: `npm test` (full suite)
4. Expected: No regressions
5. Manual:
   - Run a `.prompt` file with `pt run`
   - Run `pt history` and verify the entry shows up with the correct prompt name
   - Run `pt history --id <id>` and verify the new fields are present
   - Check that old history entries from before this change still display correctly

---

## Common Utilities Needed

- **`src/utils/prompt-format.ts`**: Format detection utility (`detectPromptFormat()`). Used by `UnifiedPromptService` during discovery and by the run command to determine execution path. Created in Phase 1.

- **`src/types/unified-prompt.ts`**: The `UnifiedPrompt` interface that bridges both systems. Used by every phase from Phase 2 onward.

- **`src/services/input-adapter.ts`**: Inquirer adapter for pupt-lib's `InputRequirement`. Used by the run command (Phase 5) and potentially by future commands that need interactive input from pupt-lib prompts.

## External Libraries Assessment

| Need | Library | Status | Notes |
|------|---------|--------|-------|
| pupt-lib integration | `pupt-lib@^1.0.1` | Add new | Core dependency for this refactor |
| Interactive prompts | `@inquirer/prompts` | Already installed | Used by input adapter |
| CLI framework | `commander` | Already installed | No changes needed |
| File operations | `fs-extra` | Already installed | No changes needed |
| Search | `minisearch` | Already installed | Will be replaced by pupt-lib's search in Phase 2 (future work) |
| Open URLs | `open` | Evaluate adding | For `openUrl` post-execution action. Alternative: use `execa` to call `xdg-open`/`open` directly |

**Note on `open` package**: The post-execution handler needs to open URLs in the default browser. Rather than adding a new dependency, we can use the existing `execa` dependency to call platform-specific commands (`xdg-open` on Linux, `open` on macOS). This avoids adding a new dependency for a single use case.

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Breaking existing `.md` prompt behavior** | High | Every phase explicitly tests backward compatibility. The Handlebars code path is not modified, only the dispatch logic changes. |
| **pupt-lib `createPromptFromSource` not exported** | Medium | Identified early. Phase 4 includes this as a prerequisite fix. Workaround: import directly from `pupt-lib/dist/create-prompt.js` if the export fix is delayed. |
| **Config migration breaks existing configs** | Medium | Migration only runs when version < 5.0.0. It adds new fields with defaults and doesn't remove any existing fields. Backup is created before migration. |
| **Babel dependency size for `.prompt` file parsing** | Low | pupt-lib already bundles `@babel/standalone` as a dependency. No additional size for pupt. |
| **pupt-lib API changes** | Low | pupt-lib is at v1.0.1 and follows semver. Pin to `^1.0.1` to get patches without breaking changes. |
| **Test isolation between Handlebars and pupt-lib paths** | Low | Tests use separate fixtures for each format. Integration tests verify both paths independently. |
| **Interactive search performance with mixed formats** | Low | UnifiedPromptService caches discovery results. Search uses pupt-lib's MiniSearch (same library as current pupt). |
