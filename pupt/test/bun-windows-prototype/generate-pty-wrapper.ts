/**
 * Generates a platform-specific wrapper that embeds the correct native library.
 * Run with: bun test/bun-windows-prototype/generate-pty-wrapper.ts [runtime|compile]
 *
 * - runtime: generates a wrapper for direct bun execution (no embedding needed)
 * - compile: generates a wrapper with `import with { type: 'file' }` for bun build --compile
 */
import { writeFileSync } from "fs";
import { join } from "path";

const mode = process.argv[2] || "compile";

const platform = process.platform;
const arch = process.arch;

// Determine the library filename
let libFilename: string;
if (platform === "darwin") {
  libFilename = arch === "arm64" ? "librust_pty_arm64.dylib" : "librust_pty.dylib";
} else if (platform === "win32") {
  libFilename = "rust_pty.dll";
} else {
  libFilename = arch === "arm64" ? "librust_pty_arm64.so" : "librust_pty.so";
}

const libRelPath = `../../node_modules/@skitee3000/bun-pty/rust-pty/target/release/${libFilename}`;

let wrapper: string;

if (mode === "compile") {
  // For bun build --compile: embed the library as a file asset
  wrapper = `// Auto-generated wrapper for ${platform}-${arch}
import libPath from "${libRelPath}" with { type: "file" };
process.env.BUN_PTY_LIB = libPath;
await import("./ci-pty-test.ts");
`;
} else {
  // For runtime: just resolve the path normally
  const absPath = join(import.meta.dir, "..", "node_modules/@skitee3000/bun-pty/rust-pty/target/release", libFilename);
  wrapper = `// Auto-generated wrapper for ${platform}-${arch}
process.env.BUN_PTY_LIB = ${JSON.stringify(absPath)};
await import("./ci-pty-test.ts");
`;
}

const outPath = join(import.meta.dir, "pty-wrapper.ts");
writeFileSync(outPath, wrapper);
console.log(`Generated ${mode} wrapper for ${platform}-${arch}:`);
console.log(`  Library: ${libFilename}`);
console.log(`  Output: ${outPath}`);
