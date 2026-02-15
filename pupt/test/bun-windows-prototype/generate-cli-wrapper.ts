/**
 * Generates a platform-specific CLI wrapper that embeds the native PTY library
 * and imports the full pupt CLI.
 * Run with: bun test/bun-windows-prototype/generate-cli-wrapper.ts
 */
import { writeFileSync } from "fs";
import { join } from "path";

const platform = process.platform;
const arch = process.arch;

let libFilename: string;
if (platform === "darwin") {
  libFilename = arch === "arm64" ? "librust_pty_arm64.dylib" : "librust_pty.dylib";
} else if (platform === "win32") {
  libFilename = "rust_pty.dll";
} else {
  libFilename = arch === "arm64" ? "librust_pty_arm64.so" : "librust_pty.so";
}

const libRelPath = `../../node_modules/@skitee3000/bun-pty/rust-pty/target/release/${libFilename}`;

const wrapper = `// Auto-generated CLI wrapper for ${platform}-${arch}
import libPath from "${libRelPath}" with { type: "file" };
process.env.BUN_PTY_LIB = libPath;
import "../../dist/cli.js";
`;

const outPath = join(import.meta.dir, "pty-wrapper-cli.ts");
writeFileSync(outPath, wrapper);
console.log(`Generated CLI wrapper for ${platform}-${arch}: ${outPath}`);
