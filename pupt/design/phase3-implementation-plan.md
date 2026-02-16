# Phase 3 Implementation Plan

## Overview

This implementation plan follows a test-driven design approach, organized into phases that deliver verifiable functionality. Each phase contains small, testable steps that build upon each other. Tests are written before implementation to ensure correctness and maintainability.

## Implementation Phases

### Phase 1: Configuration Migration and Foundation
**Goal**: Update configuration system with automatic migration and new field names  
**Verifiable Outcome**: Running `pt init` creates new config format, old configs auto-migrate

#### Steps:
1. Write tests for configuration migration logic
   - Test detection of old config files (.ptrc)
   - Test field name mapping (codingTool → defaultCmd, etc.)
   - Test backup creation
   - Test version field addition
   
2. Write tests for new config schema validation
   - Test all new field names are recognized
   - Test backward compatibility warnings
   
3. Implement configuration migration
   - Create migration utility function
   - Update config loader to detect old format
   - Implement automatic backup and conversion
   
4. Update all code references to use new field names
   - Search and replace throughout codebase
   - Update TypeScript interfaces
   
5. Write integration tests for full migration flow
   - Test `pt init` with existing old config
   - Test fresh `pt init` creates new format

### Phase 2: Search Results Context Enhancement
**Goal**: Show match context in search results  
**Verifiable Outcome**: Searching for prompts shows why each result matched

#### Steps:
1. Write unit tests for match context extraction
   - Test extracting context from title matches
   - Test extracting context from tag matches  
   - Test extracting context from content matches
   - Test priority ordering (title > tags > content)
   
2. Write tests for context display formatting
   - Test truncation of long matches
   - Test formatting with field labels
   
3. Implement match tracking in search algorithm
   - Modify search to return match metadata
   - Track which field matched and position
   
4. Implement context display in search UI
   - Update inquirer choice renderer
   - Add context line below selected item
   
5. Write integration tests
   - Test full search flow with context display
   - Test multiple match scenarios

### Phase 3: File Input Type Implementation
**Goal**: Interactive file selection with tab completion  
**Verifiable Outcome**: Prompts can use `type: file` for file selection

#### Steps:
1. Write unit tests for file listing logic
   - Test sorting by modification time
   - Test filtering with glob patterns
   - Test path normalization
   
2. Write tests for tab completion algorithm
   - Test prefix matching with trie structure
   - Test common prefix extraction
   - Test special character handling
   
3. Implement file system utilities
   - Create file listing function with caching
   - Implement trie data structure for completion
   - Create path navigation helpers
   
4. Implement custom inquirer prompt type
   - Create FilePrompt class extending inquirer
   - Implement keyboard event handling
   - Add tab completion logic
   
5. Write integration tests
   - Test full file selection flow
   - Test directory navigation
   - Test various file system scenarios

### Phase 4: ReviewFile Input Type Extension
**Goal**: File selection with automatic editor review  
**Verifiable Outcome**: Selected files open in editor when autoReview is enabled

#### Steps:
1. Write tests for reviewFile behavior
   - Test inheritance from file input type
   - Test autoReview config checking
   - Test editor launch detection
   
2. Implement ReviewFilePrompt class
   - Extend FilePrompt functionality
   - Add post-selection editor launch
   - Implement confirmation flow
   
3. Write integration tests
   - Test with various editor configurations
   - Test autoReview toggle behavior
   - Test editor cancellation handling

### Phase 5: pt install Command - Git Support
**Goal**: Install prompts from git repositories using simple-git  
**Verifiable Outcome**: `pt install https://github.com/...` clones and configures prompts

#### Steps:
1. Install and configure simple-git
   - Add simple-git as dependency
   - Create git utility module wrapping simple-git
   
2. Write tests for git URL detection
   - Test various git URL formats (https, ssh, git://)
   - Test invalid URL rejection
   
3. Write tests for git operations with mocked simple-git
   - Mock simple-git methods (clone, checkIsRepo, revparse)
   - Test clone with depth option
   - Test directory creation
   - Test .gitignore updates
   
4. Implement git installation flow
   - Create install command handler
   - Implement git URL validation
   - Use simple-git to clone with depth 1
   - Use simple-git to check if in git repo
   
5. Implement config updates
   - Add cloned directory to promptDirs
   - Update local config file
   
6. Write integration tests with mocked simple-git
   - Test full git installation flow
   - Test error handling scenarios
   - Test .gitignore modifications

### Phase 6: pt install Command - NPM Support
**Goal**: Install prompts from npm packages  
**Verifiable Outcome**: `pt install @org/package` installs and configures npm prompts

#### Steps:
1. Write tests for npm package detection
   - Test package name validation
   - Test scoped package handling
   
2. Write tests for npm operations
   - Test install command construction
   - Test package.json parsing
   - Test promptDir field detection
   
3. Implement npm installation flow
   - Detect npm project presence
   - Execute npm install command
   - Parse installed package metadata
   
4. Update config with npm paths
   - Calculate correct node_modules path
   - Add to promptDirs configuration
   
5. Write integration tests
   - Test full npm installation flow
   - Test various package configurations
   - Test error scenarios

### Phase 7: Handlebars Extensions System
**Goal**: Flexible Handlebars customization replacing partials  
**Verifiable Outcome**: Custom helpers and partials work via config

#### Steps:
1. Write tests for extension loading
   - Test inline code execution
   - Test file-based extensions
   - Test error handling
   
2. Write tests for Handlebars integration
   - Test helper registration
   - Test partial registration
   - Test decorator support
   
3. Implement extension loader
   - Create sandbox for inline code
   - Load and execute extension files
   - Pass Handlebars instance correctly
   
4. Migrate existing partials support
   - Maintain backward compatibility
   - Convert old format to new
   
5. Write integration tests
   - Test template rendering with extensions
   - Test various extension scenarios
   - Test security sandboxing

### Phase 8: AutoRun Feature
**Goal**: Automatic execution of default command  
**Verifiable Outcome**: `pt` alone runs default command when configured

#### Steps:
1. Write tests for autoRun logic
   - Test config detection
   - Test command execution trigger
   - Test option preservation
   
2. Implement autoRun in CLI entry point
   - Check config after prompt selection
   - Trigger run command automatically
   - Maintain all existing behaviors
   
3. Write integration tests
   - Test full autoRun flow
   - Test with various configurations
   - Test option interactions

### Phase 9: Minor Enhancements
**Goal**: History timestamps and .gitignore integration  
**Verifiable Outcome**: Better timestamps and automatic .gitignore updates

#### Steps:
1. Write tests for timestamp formatting
   - Test local timezone handling
   - Test filename generation
   - Test content timestamps
   
2. Write tests for .gitignore updates
   - Test entry detection
   - Test comment formatting
   - Test git repo detection
   
3. Implement timestamp improvements
   - Update history file naming
   - Use local timezone formatting
   
4. Implement .gitignore integration
   - Add to pt init flow
   - Add to pt install flow
   - Check for existing entries
   
5. Write integration tests
   - Test various timezone scenarios
   - Test .gitignore modifications
   - Test git detection logic

## Testing Strategy

### Unit Test Structure
Each component will have dedicated unit tests covering:
- Input validation
- Edge cases
- Error conditions
- Expected outputs

### Integration Test Structure
End-to-end tests will verify:
- Complete command flows
- User interactions
- File system operations
- External command execution

### Test File Organization
```
test/
├── unit/
│   ├── config/
│   │   ├── migration.test.ts
│   │   └── validation.test.ts
│   ├── input-types/
│   │   ├── file.test.ts
│   │   └── reviewFile.test.ts
│   ├── commands/
│   │   └── install.test.ts
│   ├── search/
│   │   └── context.test.ts
│   └── utils/
│       ├── handlebars.test.ts
│       └── gitignore.test.ts
└── integration/
    ├── config-migration.test.ts
    ├── file-selection.test.ts
    ├── install-git.test.ts
    ├── install-npm.test.ts
    └── autorun.test.ts
```

## Code Examples

### Configuration Migration
```typescript
// src/config/migration.ts
export interface ConfigMigration {
  version: string;
  migrate: (config: any) => any;
}

export const migrations: ConfigMigration[] = [
  {
    version: '3.0.0',
    migrate: (config) => {
      const migrated = { ...config };
      
      // Rename fields
      if ('codingTool' in config) {
        migrated.defaultCmd = config.codingTool;
        delete migrated.codingTool;
      }
      if ('codingToolArgs' in config) {
        migrated.defaultCmdArgs = config.codingToolArgs;
        delete migrated.codingToolArgs;
      }
      if ('codingToolOptions' in config) {
        migrated.defaultCmdOptions = config.codingToolOptions;
        delete migrated.codingToolOptions;
      }
      
      // Add new fields
      migrated.version = '3.0.0';
      migrated.autoReview = migrated.autoReview ?? true;
      migrated.autoRun = migrated.autoRun ?? false;
      migrated.gitPromptDir = migrated.gitPromptDir ?? '.git-prompts';
      
      return migrated;
    }
  }
];

// test/unit/config/migration.test.ts
describe('Config Migration', () => {
  it('should migrate old field names to new ones', () => {
    const oldConfig = {
      codingTool: 'claude',
      codingToolArgs: ['-p', '{{prompt}}'],
      codingToolOptions: { 'Continue?': '--continue' }
    };
    
    const migrated = migrations[0].migrate(oldConfig);
    
    expect(migrated.defaultCmd).toBe('claude');
    expect(migrated.defaultCmdArgs).toEqual(['-p', '{{prompt}}']);
    expect(migrated.defaultCmdOptions).toEqual({ 'Continue?': '--continue' });
    expect(migrated.codingTool).toBeUndefined();
  });
});
```

### File Input Type
```typescript
// src/prompts/file-prompt.ts
import { createPrompt, useState, useKeypress } from '@inquirer/core';
import { Trie } from '../utils/trie';

export const filePrompt = createPrompt<string, FilePromptConfig>((config) => {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const trie = new Trie();
  const files = listFiles(config.basePath || './', config.filter);
  files.forEach(file => trie.insert(file.path));
  
  useKeypress((key) => {
    if (key.name === 'tab') {
      const completions = trie.findCompletions(input);
      if (completions.length === 1) {
        setInput(completions[0]);
      } else if (completions.length > 1) {
        const commonPrefix = findCommonPrefix(completions);
        setInput(commonPrefix);
        setSuggestions(completions);
      }
    }
  });
  
  // ... rest of implementation
});

// test/unit/input-types/file.test.ts
describe('File Input Type', () => {
  it('should complete file path on tab', async () => {
    const files = ['src/index.ts', 'src/cli.ts', 'src/config.ts'];
    jest.spyOn(fs, 'readdirSync').mockReturnValue(files);
    
    const prompt = filePrompt({ basePath: './' });
    // Simulate user typing 'src/i' and pressing tab
    await prompt.simulateKeypress('src/i');
    await prompt.simulateKeypress({ name: 'tab' });
    
    expect(prompt.getInput()).toBe('src/index.ts');
  });
});
```

### Search Context Display
```typescript
// src/search/context.ts
export interface SearchMatch {
  prompt: Prompt;
  field: 'title' | 'tags' | 'content';
  matchText: string;
  matchIndex: number;
}

export function extractMatchContext(match: SearchMatch): string {
  const { field, matchText, matchIndex } = match;
  const maxLength = 60;
  
  let context = matchText;
  if (context.length > maxLength) {
    const start = Math.max(0, matchIndex - 20);
    const end = Math.min(context.length, start + maxLength);
    context = '...' + matchText.slice(start, end) + '...';
  }
  
  return `match: ${field}: ${context}`;
}

// test/unit/search/context.test.ts
describe('Search Context', () => {
  it('should extract context from title match', () => {
    const match: SearchMatch = {
      prompt: { title: 'REST API Generator', ... },
      field: 'title',
      matchText: 'REST API Generator',
      matchIndex: 0
    };
    
    const context = extractMatchContext(match);
    expect(context).toBe('match: title: REST API Generator');
  });
  
  it('should truncate long matches', () => {
    const longText = 'A'.repeat(100);
    const match: SearchMatch = {
      prompt: { content: longText, ... },
      field: 'content',
      matchText: longText,
      matchIndex: 50
    };
    
    const context = extractMatchContext(match);
    expect(context).toContain('...');
    expect(context.length).toBeLessThan(80);
  });
});
```

### Git Installation
```typescript
// src/commands/install.ts
import simpleGit, { SimpleGit } from 'simple-git';

export async function installFromGit(url: string, git: SimpleGit = simpleGit()): Promise<void> {
  validateGitUrl(url);
  
  const repoName = extractRepoName(url);
  const installPath = await getGitInstallPath(repoName);
  
  // Clone repository with depth 1
  await git.clone(url, installPath, ['--depth', '1']);
  
  // Update gitignore if in git repo
  const isRepo = await git.checkIsRepo();
  if (isRepo) {
    await addToGitignore(installPath);
  }
  
  // Update config
  const config = await loadConfig();
  const promptPath = path.join(installPath, 'prompts');
  if (!config.promptDirs.includes(promptPath)) {
    config.promptDirs.push(promptPath);
    await saveConfig(config);
  }
}

// test/unit/commands/install.test.ts
import { vi } from 'vitest';

describe('Git Installation', () => {
  it('should clone repository and update config', async () => {
    const mockGit = {
      clone: vi.fn().mockResolvedValue(undefined),
      checkIsRepo: vi.fn().mockResolvedValue(true)
    };
    
    await installFromGit('https://github.com/user/prompts', mockGit as any);
    
    expect(mockGit.clone).toHaveBeenCalledWith(
      'https://github.com/user/prompts',
      '.git-prompts/prompts',
      ['--depth', '1']
    );
    
    const config = await loadConfig();
    expect(config.promptDirs).toContain('.git-prompts/prompts/prompts');
  });
});
```

### Handlebars Extensions
```typescript
// src/utils/handlebars-extensions.ts
export async function loadHandlebarsExtensions(
  handlebars: typeof Handlebars,
  config: HandlebarsExtensionConfig
): Promise<void> {
  if (config.type === 'inline') {
    // Execute in sandbox
    const sandbox = {
      Handlebars: handlebars,
      console: console,
      require: createSafeRequire()
    };
    
    vm.runInNewContext(config.value, sandbox);
  } else if (config.type === 'file') {
    const extensionPath = path.resolve(config.path);
    const extension = require(extensionPath);
    
    if (typeof extension === 'function') {
      extension(handlebars);
    }
  }
}

// test/unit/utils/handlebars.test.ts
describe('Handlebars Extensions', () => {
  it('should load inline extensions', async () => {
    const handlebars = Handlebars.create();
    const config = {
      type: 'inline',
      value: "Handlebars.registerHelper('upper', s => s.toUpperCase());"
    };
    
    await loadHandlebarsExtensions(handlebars, config);
    
    const template = handlebars.compile('{{upper "hello"}}');
    expect(template({})).toBe('HELLO');
  });
});
```

### AutoRun Implementation
```typescript
// src/cli.ts
export async function main(args: string[]) {
  const command = args[0];
  
  // Existing command handling...
  
  // AutoRun logic
  if (!command) {
    const config = await loadConfig();
    if (config.autoRun && config.defaultCmd) {
      // Trigger run command automatically
      return runCommand(config);
    }
  }
}

// test/integration/autorun.test.ts
describe('AutoRun Feature', () => {
  it('should automatically run default command when enabled', async () => {
    const config = {
      autoRun: true,
      defaultCmd: 'echo',
      defaultCmdArgs: ['{{prompt}}']
    };
    
    await saveConfig(config);
    const output = await runCLI([]);
    
    expect(output).toContain('Generated prompt content');
  });
});
```

## Success Criteria

Each phase is considered complete when:
1. All unit tests pass
2. All integration tests pass
3. Manual verification confirms expected behavior
4. Code coverage meets minimum threshold (80%)
5. Documentation is updated

## Risk Mitigation

1. **Breaking Changes**: Comprehensive migration tests and backward compatibility
2. **Platform Differences**: Cross-platform test suite on Windows, macOS, Linux
3. **External Dependencies**: Mock external commands in tests, validate in integration
4. **Security**: Input validation, sandboxed execution, path traversal prevention