# Output Capture Service Tests

This document describes the comprehensive test suite for the OutputCaptureService, particularly focusing on the piping functionality and Claude-specific behavior.

## Test Files

### 1. `test/services/output-capture-piping.test.ts`
Comprehensive tests for piping functionality:
- **Basic Piping**: Tests that commands receive input correctly via PTY
- **Shell Command Execution**: Verifies shell commands work correctly across platforms
- **Claude Piping Behavior**: Tests the special handling for Claude in TTY mode
- **Error Handling**: Ensures graceful handling of errors
- **Output Capture**: Verifies ANSI stripping, size limits, and truncation
- **Cross-platform Compatibility**: Tests work on both Windows and Unix

### 2. `test/services/output-capture-comprehensive.test.ts`
Extended test coverage including:
- PTY features (resize, stdin forwarding)
- Temp file cleanup
- Edge cases (empty prompts, special characters, binary output)
- Platform-specific behavior

### 3. `test/services/output-capture.test.ts`
Original tests updated to reflect new behavior:
- Claude now uses shell piping instead of character-by-character typing
- Tests verify the shell spawning behavior

## Key Implementation Details

### Claude Piping Solution
When running Claude in TTY mode with a prompt:
1. Creates a temporary file with the prompt content
2. Spawns a shell (`/bin/sh` on Unix, `cmd.exe` on Windows)
3. Uses shell command to pipe the prompt: `cat "tempfile" | claude`
4. Maintains PTY for terminal interaction
5. Cleans up temp file after 1 second

This approach:
- ✅ Avoids paste detection in Claude
- ✅ Executes prompts immediately
- ✅ Maintains interactive terminal capabilities
- ✅ Works cross-platform

### Test Coverage
- ✅ Basic input/output piping
- ✅ Multi-line input handling
- ✅ Shell command execution
- ✅ Claude-specific behavior
- ✅ Error handling
- ✅ ANSI code stripping
- ✅ Output size limits
- ✅ Cross-platform compatibility
- ✅ Temp file cleanup

## Running the Tests

```bash
# Run piping tests
npm test test/services/output-capture-piping.test.ts

# Run comprehensive tests
npm test test/services/output-capture-comprehensive.test.ts

# Run all output capture tests
npm test test/services/output-capture*.test.ts
```

## Regression Prevention
These tests ensure that:
1. The piping mechanism continues to work correctly
2. Claude prompts don't show as "[Pasted text]"
3. Output is captured properly
4. The solution works across platforms
5. No temporary files are left behind