import { describe, it, expect } from "vitest";
import { readdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { loadPromptSource } from "./helpers/prompt-test-utils.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = join(__dirname, "..", "prompts");

// Mirrors the internal preprocessor check: /^\s*import\s+/m
// Returns true if source has NO import statements (needs auto-import injection).
function needsImportInjection(source) {
  return !/^\s*import\s+/m.test(source);
}

describe("import detection", () => {
  it("no .prompt files have bare import statements at column 0 (regression guard)", async () => {
    const files = (await readdir(PROMPTS_DIR)).filter((f) =>
      f.endsWith(".prompt"),
    );
    expect(files.length).toBeGreaterThan(0);

    const results = await Promise.all(
      files.map(async (file) => {
        const source = await loadPromptSource(file);
        return { file, needsInjection: needsImportInjection(source) };
      }),
    );

    const failures = results.filter((r) => !r.needsInjection);
    expect(
      failures,
      `These files falsely appear to have imports (preprocessor will skip auto-import): ${failures.map((f) => f.file).join(", ")}`,
    ).toHaveLength(0);
  });
});
