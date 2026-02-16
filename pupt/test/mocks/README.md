# Claude Mock for Testing

This directory contains a mock implementation of the Claude CLI for testing purposes.

## Overview

The Claude mock (`claude-mock.js`) mimics the behavior of the `@anthropic-ai/claude-code` CLI tool, allowing tests to run without requiring the actual Claude CLI to be installed.

## Features

- **TTY Mode**: Simulates Claude's interactive REPL with proper UI elements
- **Non-TTY Mode**: Handles piped input and provides direct responses
- **Math Questions**: Responds to simple arithmetic queries
- **Echo Command**: Supports "echo exactly:" for testing special characters
- **Paste Detection Bypass**: Handles piped input in TTY mode without triggering paste detection

## Usage in Tests

### Setup in Test Files

```typescript
import { setupClaudeMock } from '../helpers/claude-mock-helper.js';

describe('Your Test Suite', () => {
  let cleanupMock: () => void;

  beforeAll(() => {
    cleanupMock = setupClaudeMock();
  });

  afterAll(() => {
    cleanupMock();
  });

  // Your tests here
});
```

### Supported Inputs and Responses

The mock recognizes these patterns:

- `"What is 2 + 2?"` → `"4"`
- `"What is 3 + 3?"` → `"6"`
- `"What is 4 + 4?"` → `"8"`
- `"What is 5 + 5?"` → `"10"`
- `"What is 6 + 6?"` → `"12"`
- `"What is 7 + 5?"` → `"12"`
- `"What is 8 + 8?"` → `"16"`
- `"hello"` → `"Hello! How can I help you today?"`
- `"Echo exactly: [text]"` → Returns the exact text after "echo exactly:"
- Any other input → `"I received your message: [input]"`

### TTY Mode Behavior

In TTY mode, the mock:
1. Displays Claude's characteristic UI with box-drawing characters
2. Shows the prompt `│ > `
3. Outputs "? for shortcuts" after a short delay
4. Handles piped input without showing paste detection warnings

### Non-TTY Mode Behavior

In non-TTY mode, the mock:
1. Reads input from stdin until EOF
2. Processes the input and writes the response to stdout
3. Exits with code 0 on success

## Implementation Details

The mock detects whether it's running in TTY mode using `process.stdin.isTTY` and `process.stdout.isTTY`, then provides appropriate behavior for each mode.

## Files

- `claude-mock.js` - The main mock implementation
- `claude` - Wrapper script that can be placed in PATH
- `claude-mock.test.ts` - Tests for the mock itself
- `setup-claude-mock.js` - Setup utilities (if needed)

## Testing the Mock

Run the mock tests with:

```bash
npm test test/mocks/claude-mock.test.ts
```