import { readdirSync } from "fs";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { loadPromptSource, renderPrompt } from "./index.js";
import type { TestAllPromptsOptions, TestPromptOptions } from "./types.js";

export * from "./index.js";
export type { TestAllPromptsOptions, TestPromptOptions } from "./types.js";

const DEFAULT_FAKE_TIME = "2025-01-15T12:00:00Z";
const DEFAULT_EXPECTED_SECTIONS = ["<role>", "<task>"];

/**
 * Generate a test suite for a single .prompt file.
 *
 * Creates a `describe` block with standardized assertions:
 * 1. Renders successfully (result.ok === true)
 * 2. Contains expected sections
 * 3. Interpolates inputs (string values appear in output)
 * 4. Matches snapshot
 */
export function testPrompt(
  promptPath: string,
  options: TestPromptOptions,
): void {
  const {
    inputs,
    expectedSections = DEFAULT_EXPECTED_SECTIONS,
    snapshot = true,
    interpolation = true,
    fakeTime = DEFAULT_FAKE_TIME,
  } = options;

  // Extract filename for describe block label
  const filename = promptPath.split("/").pop() ?? promptPath;

  describe(filename, () => {
    if (fakeTime !== false) {
      beforeEach(() => {
        vi.useFakeTimers({ now: new Date(fakeTime) });
      });

      afterEach(() => {
        vi.useRealTimers();
      });
    }

    it("renders successfully", async () => {
      const result = await renderPrompt(promptPath, inputs);
      expect(result.ok).toBe(true);
    });

    it("contains expected sections", async () => {
      const result = await renderPrompt(promptPath, inputs);
      for (const section of expectedSections) {
        expect(result.text).toContain(section);
      }
    });

    if (interpolation) {
      it("interpolates inputs", async () => {
        const result = await renderPrompt(promptPath, inputs);
        for (const [, value] of Object.entries(inputs)) {
          if (typeof value === "string") {
            expect(result.text).toContain(value);
          }
        }
      });
    }

    if (snapshot) {
      it("matches snapshot", async () => {
        const result = await renderPrompt(promptPath, inputs);
        expect(result.text).toMatchSnapshot();
      });
    }
  });
}

/**
 * Discover all .prompt files in a directory and generate a test suite for each.
 *
 * Optionally includes an import detection regression guard.
 */
export function testAllPrompts(
  promptsDir: string,
  options: TestAllPromptsOptions = {},
): void {
  const {
    inputs = {},
    expectedSections = DEFAULT_EXPECTED_SECTIONS,
    snapshot = true,
    interpolation = true,
    fakeTime = DEFAULT_FAKE_TIME,
    importDetection = true,
  } = options;

  const files = readdirSync(promptsDir).filter((f) => f.endsWith(".prompt"));

  for (const file of files) {
    const promptPath = join(promptsDir, file);
    testPrompt(promptPath, {
      inputs: inputs[file] ?? {},
      expectedSections,
      snapshot,
      interpolation,
      fakeTime,
    });
  }

  if (importDetection) {
    testImportDetection(promptsDir);
  }
}

/**
 * Generate a describe block that scans all .prompt files for bare import
 * statements. This is a regression guard: bare imports cause pupt-lib's
 * preprocessor to skip auto-import injection, which silently breaks prompts.
 */
export function testImportDetection(promptsDir: string): void {
  describe("import detection", () => {
    it("no .prompt files have bare import statements (regression guard)", async () => {
      const files = readdirSync(promptsDir).filter((f) =>
        f.endsWith(".prompt"),
      );
      expect(files.length).toBeGreaterThan(0);

      const results = await Promise.all(
        files.map(async (file) => {
          const promptPath = join(promptsDir, file);
          const source = await loadPromptSource(promptPath);
          const hasImport = /^\s*import\s+/m.test(source);
          return { file, hasImport };
        }),
      );

      const failures = results.filter((r) => r.hasImport);
      expect(
        failures,
        `These files falsely appear to have imports (preprocessor will skip auto-import): ${failures.map((f) => f.file).join(", ")}`,
      ).toHaveLength(0);
    });
  });
}
