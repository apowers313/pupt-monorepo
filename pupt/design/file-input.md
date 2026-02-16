# File Input Improvement Design

## Problem Statement

The current {{file}} and {{reviewFile}} input functionality has several usability issues:

1. **No real-time autocomplete**: Users must press Tab to see suggestions, unlike the prompt search which shows results as you type. For example:
   - When typing "des" it should immediately show "design/" as a suggestion
   - Currently nothing appears until Tab is pressed
   - This breaks the expected flow and makes file selection feel clunky

2. **Character input problems**: Non-alphanumeric characters like '/' and '-' are sometimes not accepted properly
3. **Cursor alignment issues**: The cursor position doesn't align correctly with text at the end of the line
4. **Inconsistent UX**: The file input behaves differently from the prompt search, creating a jarring experience

## Current Implementation Analysis

### Existing Architecture

The file input system consists of:
- `file-prompt.ts`: Custom Inquirer prompt using `createPrompt`
- `review-file-prompt.ts`: Wrapper around file prompt that opens files in editors
- `trie.ts`: Trie-based completion logic
- `file-utils.ts`: File system operations with caching

### Key Issues Identified

1. **Manual trigger for suggestions**: The current implementation in `file-prompt.ts` only triggers suggestions in the Tab keypress handler (line 88), not on every character input. This means:
   - Users type but see no feedback until they remember to press Tab
   - The experience is inconsistent with modern autocomplete interfaces
   - Users may not even realize suggestions are available

2. **Character filtering**: The keypress handler only accepts single-character names, filtering out special characters
3. **Cursor rendering**: The cursor position calculation doesn't account for Unicode characters or terminal width properly

## Proposed Solution

### 1. Real-time Autocomplete

Transform the file input to work like the prompt search by:
- **Implementing debounced search**: Add a debounce mechanism to trigger file system searches as the user types
- **Using @inquirer/search**: Replace the custom prompt with `@inquirer/search` (same as used in prompt search) for consistency
- **Progressive loading**: Show cached results immediately, then update with fresh results

### 2. Improved Input Handling

Fix character input issues by:
- **Removing character restrictions**: Allow all printable characters including '/', '-', '.', etc.
- **Proper key event handling**: Use the full key sequence instead of just key.name
- **Support for paste operations**: Handle multi-character input from paste events

### 3. Better Cursor Management

Address cursor alignment by:
- **Using Inquirer's built-in cursor**: Leverage the search prompt's native cursor handling
- **Avoiding manual cursor rendering**: Remove the custom '│' cursor character approach

## Implementation Plan

### Phase 1: Create New File Search Prompt

Create a new implementation based on @inquirer/search that provides **continuous, real-time suggestions**:

```typescript
// src/prompts/input-types/file-search-prompt.ts
import { search } from '@inquirer/prompts';
import { FileSearchEngine } from '../../search/file-search-engine.js';

export async function fileSearchPrompt(config: FileSearchConfig): Promise<string> {
  const searchEngine = new FileSearchEngine(config.basePath, config.filter);
  
  return await search({
    message: config.message,
    source: async (input, { signal }) => {
      // CRITICAL: This function is called on EVERY keystroke
      // ensuring real-time updates as the user types
      
      // Always return results, even for partial input
      // Example: "des" should immediately return ["design/", "desktop.ini", etc.]
      const results = await searchEngine.search(input || '', signal);
      
      // If no input, show contents of current directory
      if (!input) {
        const currentDirFiles = await searchEngine.listDirectory(config.basePath);
        return currentDirFiles.map(file => ({
          name: formatFileDisplay(file),
          value: file.absolutePath,
          description: file.relativePath,
        }));
      }
      
      return results.map(file => ({
        name: formatFileDisplay(file),
        value: file.absolutePath,
        description: file.relativePath,
      }));
    },
  });
}
```

**Key difference**: The `source` function is called automatically on every keystroke by the @inquirer/search component, not just on Tab press.

### Phase 2: File Search Engine

Create a dedicated search engine for files that supports real-time, progressive search:

```typescript
// src/search/file-search-engine.ts
export class FileSearchEngine {
  private cache: Map<string, FileInfo[]> = new Map();
  
  async search(query: string, signal?: AbortSignal): Promise<FileInfo[]> {
    // Handle different query patterns:
    // "des" -> should find "design/" in current directory
    // "design/ph" -> should find "design/phase*.md"
    // "/usr/lo" -> should find "/usr/local/"
    
    const { searchPath, searchTerm } = this.parseSearchQuery(query);
    
    // Get all accessible paths from searchPath
    const candidates = await this.getCandidatePaths(searchPath, signal);
    
    // Filter based on searchTerm - this happens on EVERY keystroke
    if (!searchTerm) {
      return candidates; // Show all files in directory
    }
    
    // Fuzzy match against the search term
    return candidates.filter(file => {
      const name = file.name.toLowerCase();
      const term = searchTerm.toLowerCase();
      
      // Prefix matching (most important for file paths)
      if (name.startsWith(term)) return true;
      
      // Fuzzy matching for convenience
      return this.fuzzyMatch(name, term);
    }).sort((a, b) => {
      // Prioritize exact prefix matches
      const aStarts = a.name.toLowerCase().startsWith(searchTerm.toLowerCase());
      const bStarts = b.name.toLowerCase().startsWith(searchTerm.toLowerCase());
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      
      // Then directories
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      
      // Then by name
      return a.name.localeCompare(b.name);
    });
  }
  
  private parseSearchQuery(query: string): { searchPath: string, searchTerm: string } {
    // Smart parsing to handle various input patterns
    const lastSep = query.lastIndexOf('/');
    
    if (lastSep === -1) {
      // No separator - searching in current directory
      return { searchPath: '.', searchTerm: query };
    }
    
    // Has separator - search within that directory
    return {
      searchPath: query.substring(0, lastSep + 1) || '.',
      searchTerm: query.substring(lastSep + 1)
    };
  }
}
```

**Critical implementation notes**:
1. The search function is called on EVERY keystroke, not just on Tab
2. Results are filtered and returned immediately for responsive feel
3. Prefix matching is prioritized over fuzzy matching for predictable behavior
4. Directory traversal works naturally (typing "/" shows contents of that directory)

### Phase 3: Integration Points

1. **Update template engine** to use new file search prompt:
   ```typescript
   // src/template/helpers/interactive.ts
   case 'file':
     return await fileSearchPrompt({
       message: options.message || 'Select a file:',
       basePath: options.basePath || process.cwd(),
       filter: options.filter,
       default: options.default,
     });
   ```

2. **Maintain backward compatibility** by keeping the old prompt available but deprecated

3. **Reuse for reviewFile**: The reviewFile functionality will automatically benefit from the improved file selection

### Phase 4: Enhanced Features

1. **Smart path completion**:
   - Auto-complete directory separators
   - Handle ~ expansion in real-time
   - Show directory indicators (trailing /)

2. **File type indicators**:
   - Show file icons or badges
   - Display file size and modification time
   - Color code by file type

3. **Search modes**:
   - Fuzzy search within filenames
   - Full path search
   - Recently used files

## Testing Strategy

1. **Unit tests**:
   - File search engine logic
   - Path parsing and completion
   - Cache behavior
   - Real-time filtering on each character

2. **Integration tests**:
   - End-to-end file selection flow
   - Special character handling
   - Cross-platform path handling
   - **Continuous search behavior**: Verify results appear without Tab press

3. **Manual testing checklist**:
   - [ ] Type "des" and verify "design/" appears immediately without pressing Tab
   - [ ] Type "design/ph" and verify "phase*.md" files appear in real-time
   - [ ] Type '/' and ensure it's accepted and shows root directory contents
   - [ ] Type '-' in filenames (e.g., "file-input")
   - [ ] Navigate deeply nested directories with continuous feedback
   - [ ] Use ~ for home directory
   - [ ] Test with symlinks
   - [ ] Verify cursor stays aligned
   - [ ] Test abort/cancel behavior
   - [ ] Verify backspace updates results in real-time
   - [ ] Test performance with directories containing 1000+ files

4. **Cross-platform testing**:
   - **Windows**:
     - [ ] Test with backslash paths: `C:\Users\name\Documents`
     - [ ] Test with forward slash paths: `C:/Users/name/Documents`
     - [ ] Test drive letters: `D:\`, `E:\`
     - [ ] Test UNC paths: `\\server\share`
     - [ ] Verify case-insensitive matching works
   - **macOS**:
     - [ ] Test with spaces in paths: `/Users/name/My Documents`
     - [ ] Test case-insensitive matching on case-insensitive volumes
     - [ ] Test `/Volumes/` for external drives
   - **Linux**:
     - [ ] Test case-sensitive matching
     - [ ] Test hidden files starting with `.`
     - [ ] Test paths with special characters

## Migration Path

1. **Phase 1**: Implement new file search alongside existing file prompt
2. **Phase 2**: Update templates to use new implementation with feature flag
3. **Phase 3**: Deprecate old implementation with warnings
4. **Phase 4**: Remove old implementation in next major version

## Success Metrics

- File selection is as smooth as prompt selection
- All special characters work correctly
- No cursor alignment issues
- Consistent UX across all interactive elements
- Performance remains fast even with large directories

## Key Behavioral Changes

### Current Behavior (Problems)
1. User types "des" → Nothing happens
2. User presses Tab → "design/" appears and completes
3. User must remember to press Tab for any suggestions

### New Behavior (Solution)
1. User types "d" → Shows all files/folders starting with "d"
2. User types "de" → Narrows to "design/", "demo.txt", etc.
3. User types "des" → Shows "design/" prominently
4. User continues typing or selects from live results
5. **No Tab press required** - results update continuously

This matches the behavior of the prompt search where typing immediately filters results.

## Cross-Platform Considerations

### Path Separator Handling

The file input must work correctly across Windows, Linux, and macOS:

1. **Windows Path Handling**:
   ```typescript
   // Windows uses backslash but also accepts forward slash
   // "C:\Users\name\des" → should find "C:\Users\name\design\"
   // "C:/Users/name/des" → should also work
   
   const normalizedPath = path.normalize(input);
   const separator = path.sep; // '\' on Windows, '/' on Unix
   ```

2. **Universal Path Display**:
   ```typescript
   function formatFileDisplay(file: FileInfo): string {
     // Always use forward slashes in display for consistency
     const displayPath = file.relativePath.replace(/\\/g, '/');
     
     // But preserve native separators in the actual value
     return {
       display: displayPath + (file.isDirectory ? '/' : ''),
       value: file.absolutePath // Keep native separators
     };
   }
   ```

3. **Input Normalization**:
   ```typescript
   function normalizeInput(input: string): string {
     // Accept both separators during typing
     if (process.platform === 'win32') {
       // On Windows, normalize forward slashes to backslashes
       return input.replace(/\//g, path.sep);
     }
     // On Unix, backslashes might be valid filename chars
     return input;
   }
   ```

### Platform-Specific Features

1. **Case Sensitivity**:
   ```typescript
   const isFileSystemCaseSensitive = process.platform !== 'win32' && process.platform !== 'darwin';
   
   function matchesFile(input: string, filename: string): boolean {
     if (isFileSystemCaseSensitive) {
       return filename.startsWith(input);
     }
     return filename.toLowerCase().startsWith(input.toLowerCase());
   }
   ```

2. **Hidden Files**:
   ```typescript
   function isHidden(filename: string): boolean {
     // Unix hidden files start with '.'
     if (filename.startsWith('.')) return true;
     
     // Windows hidden files require checking attributes
     if (process.platform === 'win32') {
       // Would need to check file attributes
       return false; // Simplified for now
     }
     
     return false;
   }
   ```

3. **Path Length Limits**:
   - Windows: 260 characters (without long path support)
   - Unix: Typically 4096 characters
   - Show warnings when approaching limits

### Implementation Updates

Update the FileSearchEngine to handle platform differences:

```typescript
export class FileSearchEngine {
  private pathSeparatorRegex: RegExp;
  
  constructor(basePath: string, filter?: string) {
    // Create regex that matches either separator
    this.pathSeparatorRegex = process.platform === 'win32' 
      ? /[/\\]/
      : /\//;
  }
  
  private parseSearchQuery(query: string): { searchPath: string, searchTerm: string } {
    // Handle both separators on all platforms
    const parts = query.split(this.pathSeparatorRegex);
    const searchTerm = parts.pop() || '';
    const searchPath = parts.length > 0 
      ? parts.join(path.sep) + path.sep 
      : '.';
    
    return { searchPath, searchTerm };
  }
  
  async search(query: string, signal?: AbortSignal): Promise<FileInfo[]> {
    // Normalize the input based on platform
    const normalizedQuery = this.normalizePathInput(query);
    
    // Continue with search...
  }
  
  private normalizePathInput(input: string): string {
    // Handle home directory expansion
    if (input.startsWith('~')) {
      input = input.replace(/^~/, os.homedir());
    }
    
    // Normalize separators for the current platform
    return path.normalize(input);
  }
}
```

## Alternative Approaches Considered

1. **Fix existing implementation**: Would require significant refactoring of the key handling logic to trigger search on every keypress instead of just Tab
2. **Use external file picker**: Would add dependencies and reduce consistency
3. **Shell-style completion**: Too different from the rest of the UI

The proposed approach leverages existing proven components (@inquirer/search) while maintaining consistency with the prompt search experience.