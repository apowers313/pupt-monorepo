// Suppress console output during tests unless explicitly enabled
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug
};

// Store original stdout write
const originalStdoutWrite = process.stdout.write.bind(process.stdout);
const originalStderrWrite = process.stderr.write.bind(process.stderr);

// Check if running in verbose mode (coverage, UI, or watch mode)
const isVerbose = process.env.PT_TEST_VERBOSE === 'true' || 
  process.argv.includes('--coverage') ||
  process.argv.includes('--ui') ||
  process.argv.includes('--watch') ||
  process.argv.includes('--reporter=verbose');

if (!isVerbose) {
  console.log = () => {};
  console.warn = () => {};
  console.info = () => {};
  console.debug = () => {};
  // Keep error for important messages, but make it less verbose
  console.error = (...args: any[]) => {
    // Only show actual errors, not debug messages
    const message = args.join(' ');
    if (message.includes('Error') || message.includes('error') && !message.includes('STDERR')) {
      originalConsole.error(...args);
    }
  };
  
  // Suppress stdout.write calls from tests (not from vitest itself)
  process.stdout.write = function(chunk: any, encoding?: any, callback?: any) {
    const str = chunk?.toString() || '';
    // Allow vitest's own output (test progress, results, etc.)
    if (str.includes(' ✓ ') || str.includes(' ✗ ') || str.includes(' ❯ ') || 
        str.includes('Test Files') || str.includes('Tests') || str.includes('Duration') ||
        str.includes('RUN ') || str.includes('PASS ') || str.includes('FAIL ') ||
        str.includes(' passed ') || str.includes(' failed ') || str.includes(' skipped ') ||
        str.includes('ms)') || str.includes('test/') || str.includes(' tests)') ||
        str.includes('Start at') || str.includes('(transform')) {
      return originalStdoutWrite(chunk, encoding, callback);
    }
    
    // Suppress specific patterns that are just noise
    if (str.includes('Auto-update failed') || // Claude UI
        str.includes('hello claude') || // Claude UI
        str.includes('│ > ? for shortcuts') || // Claude UI
        /\[2K\[1A/.test(str) || // ANSI cursor movement
        /\[2m\[38;5/.test(str) || // ANSI color codes
        /^[X]{20,}/.test(str.trim()) || // Long strings of X
        /^(arg ){10,}/.test(str.trim()) || // Repeated 'arg'
        str.includes('Binary:') || // Binary output
        str.includes('execvp(3) failed') || // Error messages from tests
        /^Test with/.test(str.trim()) || // Test data strings
        /^Line \d+$/.test(str.trim()) || // Line number output
        str.trim() === 'test' || // Simple test output
        str.trim().match(/^\d+$/) || // Just numbers
        str.includes('Processing:') || // Processing messages
        str.includes('Location:') || // Location messages
        str.includes('Running:') || // Running messages
        str.includes('────────') || // Separator lines
        str.includes('[DEBUG]') || // Debug messages
        str.includes('Installing prompts from') || // Install messages
        str.includes('Successfully installed prompts') || // Success messages
        str.includes('Error:') || // Error messages (keep actual errors via stderr)
        str.includes('✓ Configuration created successfully!')) { // Config messages
      if (typeof callback === 'function') {
        callback();
      }
      return true;
    }
    
    // Log unexpected output during debugging (comment out in production)
    // originalConsole.log('[STDOUT]:', str);
    
    // Suppress all other test output
    if (typeof callback === 'function') {
      callback();
    }
    return true;
  };
  
  // Keep stderr for errors
  process.stderr.write = function(chunk: any, encoding?: any, callback?: any) {
    const str = chunk?.toString() || '';
    // Filter out non-error output
    if (str.includes('Error') || str.includes('error') || str.includes('failed')) {
      return originalStderrWrite(chunk, encoding, callback);
    }
    if (typeof callback === 'function') {
      callback();
    }
    return true;
  };
}

// Suppress unhandled rejection warnings for ERR_IPC_CHANNEL_CLOSED
process.on('unhandledRejection', (error: any) => {
  if (error?.code === 'ERR_IPC_CHANNEL_CLOSED') {
    // Ignore IPC channel closed errors - this is a known issue with vitest/tinypool
    return;
  }
  // Log other unhandled rejections without exiting
  if (isVerbose) {
    originalConsole.error('Unhandled Rejection:', error);
  }
});

// Force garbage collection after each test to help with memory management
if (global.gc) {
  afterEach(() => {
    global.gc();
  });
}