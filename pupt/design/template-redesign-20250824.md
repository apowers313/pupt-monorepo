# Template Engine Redesign - Fixing Variable Reference Processing

**Author**: Adam Powers  
**Date**: 2025-08-24  
**Status**: Design Proposal

## Table of Contents
1. [Problem Statement](#problem-statement)
2. [Current System Analysis](#current-system-analysis)
3. [Root Cause Analysis](#root-cause-analysis)
4. [Proposed Solution](#proposed-solution)
5. [Implementation Details](#implementation-details)
6. [Migration Strategy](#migration-strategy)
7. [Testing Strategy](#testing-strategy)
8. [Risks and Mitigations](#risks-and-mitigations)

## Problem Statement

### Error Description
When running prompts with variable references inside Handlebars block helpers, the template engine throws parsing errors:

```
Error: Parse error on line 99:
...t message.__VAR_2__
----------------------^
Expecting 'OPEN_INVERSE_CHAIN', 'INVERSE', 'OPEN_ENDBLOCK', got 'EOF'
```

### Example Failing Template
```handlebars
{{#if (confirm "addBody" "Add body?")}}
git commit -m "{{commitType}}: {{commitMessage}}"
{{/if}}
```

This error occurs because the template engine's variable substitution mechanism interferes with Handlebars' parsing.

## Current System Analysis

### How the Current System Works

The current template engine (`src/template/template-engine.ts`) uses a multi-phase approach:

1. **Phase 1: Variable Reference Substitution**
   - Regex pattern identifies variable references: `/\{\{([^{}\s]+)\}\}/g`
   - Replaces them with placeholders: `{{varName}}` → `__VAR_0__`
   - Stores mappings for later restoration

2. **Phase 2: Initial Handlebars Compilation**
   - Compiles template with placeholders
   - Helpers like `{{input}}` create async placeholders: `__ASYNC_input_name__`
   - Result contains mix of content and async placeholders

3. **Phase 3: Async Operation Processing**
   - Executes all queued async operations (user inputs)
   - Replaces async placeholders with actual values

4. **Phase 4: Variable Reference Restoration**
   - Restores original variable references: `__VAR_0__` → `{{varName}}`

5. **Phase 5: Final Compilation**
   - Compiles template again with all collected values
   - Renders final output

### Why This Design Exists

The variable substitution was implemented to solve a timing problem:
- Handlebars is synchronous - it resolves all variables during compilation
- User input helpers are asynchronous - they need to wait for user responses
- If `{{name}}` appears before `{{input "name"}}`, it would resolve to undefined

### Why It's Broken

The placeholder substitution breaks Handlebars parsing in several ways:

1. **Syntax Context Violation**: When `{{varName}}` becomes `__VAR_0__` inside a block helper, Handlebars' parser sees this as invalid syntax
2. **Parser State Machine**: Handlebars expects specific tokens after `{{#if}}` blocks, but encounters raw text like `__VAR_0__`
3. **Error Messages**: The error "Expecting 'OPEN_INVERSE_CHAIN', 'INVERSE', 'OPEN_ENDBLOCK'" indicates the parser is looking for Handlebars tokens but finding placeholder text

Example of the problem:
```handlebars
{{#if condition}}
  {{myVar}}  <!-- becomes __VAR_0__ -->
{{/if}}

<!-- Handlebars parser sees: -->
{{#if condition}}
  __VAR_0__  <!-- Parser thinks this should be a Handlebars expression -->
{{/if}}
```

## Root Cause Analysis

The fundamental issue is mixing two different template processing strategies:
1. **Regex-based text substitution** (for hiding variables)
2. **AST-based template compilation** (Handlebars)

These don't compose well because:
- Regex substitution is not context-aware
- It doesn't understand Handlebars' syntax rules
- Placeholders can appear in positions where Handlebars expects specific tokens

## Proposed Solution

### Two-Pass Compilation Architecture

Instead of manipulating the template text with regex, use Handlebars' own features to handle missing variables gracefully.

#### Pass 1: Input Collection
- Configure Handlebars to ignore unknown variables
- Register only async input helpers
- Compile and execute to collect all user inputs
- No text manipulation or placeholders

#### Pass 2: Final Rendering
- Use a fresh Handlebars instance
- Register all helpers (input, static, etc.)
- Compile with all collected values available
- Render final output

### Key Advantages
1. **No regex manipulation** - template stays intact
2. **Handlebars handles everything** - proper AST-based processing
3. **Clean error messages** - if errors occur, they're standard Handlebars errors
4. **Simpler mental model** - two clear phases instead of five

## Implementation Details

### 1. New TemplateEngine Class Structure

```typescript
export class TemplateEngine {
  private context: TemplateContext;
  
  async processTemplate(
    template: string, 
    initialVars: Record<string, unknown>
  ): Promise<string> {
    // Remove raw block handling (keep as-is)
    template = this.extractRawBlocks(template);
    
    // Pass 1: Collection
    const collectedValues = await this.collectInputs(template, initialVars);
    
    // Pass 2: Rendering
    const finalOutput = await this.renderTemplate(template, {
      ...initialVars,
      ...collectedValues
    });
    
    // Restore raw blocks
    return this.restoreRawBlocks(finalOutput);
  }
  
  private async collectInputs(
    template: string,
    initialVars: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const handlebars = Handlebars.create();
    
    // Configure to silently ignore missing variables
    handlebars.registerHelper('helperMissing', function(this: any) {
      return '';  // Return empty string for missing variables
    });
    
    handlebars.registerHelper('blockHelperMissing', function(this: any) {
      return '';  // Return empty string for missing block helpers
    });
    
    // Register only input collection helpers
    registerInputHelpers(handlebars, this.context);
    
    // Compile and execute
    const compiled = handlebars.compile(template, { 
      noEscape: true,
      strict: false  // Don't throw on missing vars
    });
    
    compiled(initialVars);
    
    // Process all async operations
    await this.context.processAsyncOperations();
    
    // Return collected values
    return Object.fromEntries(this.context.getAllValues());
  }
  
  private renderTemplate(
    template: string,
    allValues: Record<string, unknown>
  ): string {
    const handlebars = Handlebars.create();
    
    // Register ALL helpers for final rendering
    registerAllHelpers(handlebars, this.context);
    
    // Compile with all values available
    const compiled = handlebars.compile(template, {
      noEscape: true,
      strict: true  // Now we want errors for missing vars
    });
    
    return compiled(allValues);
  }
}
```

### 2. Modified Helper Registration

Split helper registration into two functions:

```typescript
// For Pass 1: Only async input helpers
export function registerInputHelpers(
  handlebars: typeof Handlebars, 
  context: TemplateContext
) {
  const inputTypes = ['input', 'select', 'multiselect', 'confirm', 
                      'editor', 'password', 'file', 'reviewFile'];
  
  inputTypes.forEach(type => {
    handlebars.registerHelper(type, createAsyncHelper(type, context));
  });
}

// For Pass 2: All helpers including static ones
export function registerAllHelpers(
  handlebars: typeof Handlebars,
  context: TemplateContext  
) {
  // Register input helpers (now they return values, not placeholders)
  registerInputHelpers(handlebars, context);
  
  // Register static helpers
  handlebars.registerHelper('date', () => DateFormats.LOCAL_DATE(new Date()));
  handlebars.registerHelper('time', () => DateFormats.LOCAL_TIME(new Date()));
  handlebars.registerHelper('datetime', () => DateFormats.LOCAL_DATETIME(new Date()));
  handlebars.registerHelper('timestamp', () => Date.now());
  handlebars.registerHelper('uuid', () => crypto.randomUUID());
  // ... etc
}
```

### 3. Updated Async Helper Implementation

```typescript
function createAsyncHelper(type: string, context: TemplateContext) {
  return function(this: any, ...args: any[]) {
    const options = args[args.length - 1];
    const name = args[0];
    
    // In Pass 1: Queue operation and return empty
    if (!context.has(name)) {
      context.queueAsyncOperation(async () => {
        const value = await promptUser(type, args);
        context.set(name, value);
      });
      return '';  // Return empty during collection
    }
    
    // In Pass 2: Return the collected value
    return String(context.get(name));
  };
}
```

### 4. Context Modifications

The TemplateContext class needs minor updates:

```typescript
export class TemplateContext {
  // Add method to check if value exists
  has(name: string): boolean {
    return this.values.has(name);
  }
  
  // Modify async processing to not require placeholders
  async processAsyncOperations(): Promise<void> {
    const operations = [...this.asyncOperations];
    this.asyncOperations = [];
    
    // Execute all operations
    const results = await Promise.all(
      operations.map(op => op())
    );
    
    // No need to replace placeholders - values are already in context
  }
}
```

## Migration Strategy

### Phase 1: Parallel Implementation
1. Create new `TemplateEngineV2` class with two-pass architecture
2. Add feature flag to choose between engines
3. Keep existing TemplateEngine unchanged

### Phase 2: Testing
1. Run all existing tests against both engines
2. Add specific tests for problematic templates
3. Compare outputs to ensure compatibility

### Phase 3: Gradual Rollout
1. Enable V2 engine for new prompts first
2. Test with existing complex prompts
3. Monitor for issues

### Phase 4: Cleanup
1. Remove old TemplateEngine
2. Rename V2 to TemplateEngine
3. Remove variable substitution code

## Testing Strategy

### Unit Tests
```typescript
describe('TemplateEngineV2', () => {
  it('handles variable references in block helpers', async () => {
    const template = `
      {{#if (confirm "proceed" "Continue?")}}
        Result: {{input "result" "Enter result"}}
        Again: {{result}}
      {{/if}}
    `;
    
    // Mock user responses
    mockConfirm(true);
    mockInput('test-value');
    
    const output = await engine.processTemplate(template, {});
    expect(output).toContain('Result: test-value');
    expect(output).toContain('Again: test-value');
  });
  
  it('handles nested block helpers', async () => {
    const template = `
      {{#if condition}}
        {{#each items}}
          {{name}}: {{value}}
        {{/each}}
      {{/if}}
    `;
    
    const output = await engine.processTemplate(template, {
      condition: true,
      items: [{name: 'a', value: 1}]
    });
    
    expect(output).toContain('a: 1');
  });
});
```

### Integration Tests
- Test all existing prompts
- Test complex nested structures
- Test error conditions
- Test non-interactive mode

### Regression Tests
Create specific tests for the reported issue:
```typescript
it('should handle git commit template without errors', async () => {
  const template = fs.readFileSync('prompts/git-commit-comment.md', 'utf8');
  const output = await engine.processTemplate(template, {});
  expect(output).not.toContain('__VAR_');
  expect(output).not.toContain('Parse error');
});
```

## Risks and Mitigations

### Risk 1: Breaking Existing Prompts
**Mitigation**: Extensive testing with all existing prompts before rollout

### Risk 2: Performance Impact
**Mitigation**: Two passes should be comparable to current five phases

### Risk 3: Different Output
**Mitigation**: Side-by-side comparison testing during migration

### Risk 4: Edge Cases
**Mitigation**: Comprehensive test suite covering various template patterns

## Success Criteria

1. **No Parsing Errors**: Templates with variable references in block helpers work correctly
2. **Backward Compatible**: All existing prompts produce identical output
3. **Cleaner Code**: Removal of regex-based variable substitution
4. **Better Errors**: Meaningful error messages when templates have issues
5. **Maintainable**: Simpler architecture that's easier to understand and modify

## Conclusion

The two-pass compilation approach eliminates the fundamental conflict between regex text manipulation and AST-based template processing. By leveraging Handlebars' own capabilities to handle missing variables gracefully, we can achieve the same async collection behavior without breaking the parser.

This design preserves all current functionality while fixing the parsing errors and simplifying the codebase significantly.