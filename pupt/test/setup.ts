// Suppress unhandled rejection warnings for ERR_IPC_CHANNEL_CLOSED
process.on('unhandledRejection', (error: any) => {
  if (error?.code === 'ERR_IPC_CHANNEL_CLOSED') {
    // Ignore IPC channel closed errors - this is a known issue with vitest/tinypool
    return;
  }
  // Log other unhandled rejections without exiting
  console.error('Unhandled Rejection:', error);
});

// Force garbage collection after each test to help with memory management
if (global.gc) {
  afterEach(() => {
    global.gc();
  });
}