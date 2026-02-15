/**
 * Cross-platform bun-pty test.
 * Expects BUN_PTY_LIB to be set before import (done by the platform-specific wrapper).
 */
import { spawn } from "@skitee3000/bun-pty";

const isWindows = process.platform === "win32";
const shell = isWindows ? "cmd.exe" : "bash";
const echoCmd = isWindows ? "echo hello\r\n" : "echo hello\n";
const exitCmd = isWindows ? "exit\r\n" : "exit\n";

console.log("=== bun-pty cross-platform test ===");
console.log("Platform:", process.platform, process.arch);
console.log("Shell:", shell);
console.log("BUN_PTY_LIB:", process.env.BUN_PTY_LIB);

const pty = spawn(shell, [], {
  cols: 80,
  rows: 24,
  cwd: process.env.TEMP || process.env.TMPDIR || "/tmp",
});

console.log("PID:", pty.pid);

let output = "";
let exited = false;

pty.onData((data: string) => {
  output += data;
});

pty.onExit((ev: { exitCode: number }) => {
  exited = true;
  console.log("Exit code:", ev.exitCode);
  const hasHello = output.includes("hello");
  console.log("Captured output length:", output.length);
  console.log("Output contains 'hello':", hasHello);
  if (hasHello) {
    console.log("=== PTY test PASSED ===");
    process.exit(0);
  } else {
    console.log("=== PTY test FAILED (no hello in output) ===");
    console.log("Raw output:", JSON.stringify(output.slice(0, 500)));
    process.exit(1);
  }
});

setTimeout(() => {
  console.log("--- Writing echo command ---");
  pty.write(echoCmd);
}, 1000);

setTimeout(() => {
  console.log("--- Writing exit command ---");
  pty.write(exitCmd);
}, 2500);

setTimeout(() => {
  if (!exited) {
    console.log("=== PTY test FAILED (timeout) ===");
    console.log("Output so far:", JSON.stringify(output.slice(0, 500)));
    pty.kill();
    process.exit(1);
  }
}, 10000);
