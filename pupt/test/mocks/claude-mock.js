#!/usr/bin/env node

/**
 * Mock Claude executable for testing
 * Mimics the behavior of @anthropic-ai/claude-code CLI
 */

import readline from 'readline';
import { Buffer } from 'buffer';

// Check if we're in TTY mode
const isTTY = process.stdin.isTTY && process.stdout.isTTY;

// Store input for processing
let inputBuffer = '';
let hasReceivedInput = false;
let rl = null;

// Function to process and respond to input
function processInput(input) {
  const trimmed = input.trim().toLowerCase();
  
  // Simple responses for math questions
  if (trimmed.includes('2+2') || trimmed.includes('2 + 2')) {
    return '4';
  } else if (trimmed.includes('3+3') || trimmed.includes('3 + 3')) {
    return '6';
  } else if (trimmed.includes('4+4') || trimmed.includes('4 + 4')) {
    return '8';
  } else if (trimmed.includes('5+5') || trimmed.includes('5 + 5')) {
    return '10';
  } else if (trimmed.includes('6+6') || trimmed.includes('6 + 6')) {
    return '12';
  } else if (trimmed.includes('7+5') || trimmed.includes('7 + 5')) {
    return '12';
  } else if (trimmed.includes('8+8') || trimmed.includes('8 + 8')) {
    return '16';
  } else if (trimmed.includes('hello')) {
    return 'Hello! How can I help you today?';
  } else if (trimmed.includes('echo exactly:')) {
    // Extract the part after "echo exactly:"
    const match = input.match(/echo exactly:\s*(.+)/i);
    return match ? match[1] : input;
  } else {
    return `I received your message: "${input}"`;
  }
}

// ANSI escape sequences
const ESC = '\x1b[';
const CLEAR_SCREEN = ESC + '2J' + ESC + 'H';
const HIDE_CURSOR = ESC + '?25l';
const SHOW_CURSOR = ESC + '?25h';
const MOVE_UP = ESC + '1A';
const CLEAR_LINE = ESC + '2K';
const MOVE_TO_COL = ESC + 'G';

if (isTTY) {
  // TTY Mode - Interactive REPL
  
  // Send initial escape sequences that match Claude's behavior
  process.stdout.write(CLEAR_LINE + MOVE_UP + CLEAR_LINE + MOVE_UP + CLEAR_LINE + MOVE_UP);
  process.stdout.write(CLEAR_LINE + MOVE_UP + CLEAR_LINE + MOVE_UP + CLEAR_LINE + MOVE_UP);
  process.stdout.write(CLEAR_LINE + MOVE_TO_COL + '\n');
  
  // Welcome message - matches test expectations
  process.stdout.write('\x1b[2m\x1b[38;5;244m╭──────────────────────────────────────────────────────────────────────────────╮\x1b[39m\x1b[22m\n');
  process.stdout.write('\x1b[2m\x1b[38;5;244m│\x1b[39m\x1b[22m > hello claude                                                               \x1b[2m\x1b[38;5;244m│\x1b[39m\x1b[22m\n');
  process.stdout.write('\x1b[2m\x1b[38;5;244m│\x1b[39m\x1b[22m   \x1b[7m \x1b[27m                                                                          \x1b[2m\x1b[38;5;244m│\x1b[39m\x1b[22m\n');
  process.stdout.write('\x1b[2m\x1b[38;5;244m╰──────────────────────────────────────────────────────────────────────────────╯\x1b[39m\x1b[22m\n');
  process.stdout.write('                         \x1b[38;5;211m✗ Auto-update failed · Try \x1b[1mclaude doctor\x1b[22m or \x1b[1mnpm i -g \x1b[22m\x1b[39m\n');
  process.stdout.write('                         \x1b[38;5;211m\x1b[1m@anthropic-ai/claude-code\x1b[22m\x1b[39m\n');
  process.stdout.write('\n\n');

  // Alternative welcome that some tests expect
  setTimeout(() => {
    // Send additional UI elements
    process.stdout.write('? for shortcuts');
  }, 50);

  rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: ''
  });

  // Handle direct data input (for piped commands)
  let dataReceived = false;
  process.stdin.on('data', (data) => {
    if (!dataReceived) {
      dataReceived = true;
      const input = data.toString();
      
      // Check if this is piped input (multiple characters at once)
      if (input.length > 1 && !hasReceivedInput) {
        hasReceivedInput = true;
        // Echo the input first (as it would appear when piped)
        process.stdout.write(input);
        process.stdout.write('\n');
        const response = processInput(input);
        process.stdout.write(response + '\n');
        
        // Exit immediately after responding to piped input
        process.exit(0);
      }
    }
  });

  rl.on('line', (line) => {
    if (!hasReceivedInput) {
      hasReceivedInput = true;
      const response = processInput(line);
      process.stdout.write('\n' + response + '\n\n');
      
      // Show prompt again
      process.stdout.write('│ > ');
    }
  });

  rl.on('SIGINT', () => {
    process.stdout.write('\nGoodbye!\n');
    process.exit(0);
  });

  // Timeout for tests - exit after a short delay if we've provided a response
  setTimeout(() => {
    process.exit(0);
  }, 5000);

} else {
  // Non-TTY Mode - Direct input/output
  
  process.stdin.setEncoding('utf8');
  
  let dataTimeout = null;
  
  process.stdin.on('data', (chunk) => {
    inputBuffer += chunk;
    
    // Clear existing timeout
    if (dataTimeout) {
      clearTimeout(dataTimeout);
    }
    
    // If we receive a newline, process immediately
    if (chunk.includes('\n')) {
      const response = processInput(inputBuffer);
      process.stdout.write(response + '\n');
      process.exit(0);
    } else {
      // Otherwise wait a bit for more data
      dataTimeout = setTimeout(() => {
        if (inputBuffer) {
          const response = processInput(inputBuffer);
          process.stdout.write(response + '\n');
        }
        process.exit(0);
      }, 500);
    }
  });
  
  process.stdin.on('end', () => {
    if (inputBuffer) {
      const response = processInput(inputBuffer);
      process.stdout.write(response + '\n');
    }
    process.exit(0);
  });
  
  // Handle timeout for tests
  setTimeout(() => {
    if (!inputBuffer) {
      process.stderr.write('No input received\n');
      process.exit(1);
    }
  }, 5000);
}