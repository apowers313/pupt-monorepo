import { afterEach,beforeEach, describe, expect, it, vi } from "vitest";

import {
  compilePrompt,
  loadPromptSource,
  renderPrompt,
  renderPromptSource,
} from "../src/index.js";

describe("loadPromptSource", () => {
  it("reads a .prompt file", async () => {
    const source = await loadPromptSource("test/fixtures/simple.prompt");
    expect(source).toContain("<Prompt");
    expect(source).toContain("simple-test");
  });

  it("rejects on missing file", async () => {
    await expect(
      loadPromptSource("test/fixtures/nonexistent.prompt"),
    ).rejects.toThrow();
  });
});

describe("compilePrompt", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2025-01-15T12:00:00Z") });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("compiles a .prompt file to a PuptElement", async () => {
    const element = await compilePrompt("test/fixtures/simple.prompt");
    expect(element).toBeDefined();
  });
});

describe("renderPrompt", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2025-01-15T12:00:00Z") });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders a prompt with inputs", async () => {
    const result = await renderPrompt("test/fixtures/simple.prompt", {
      message: "Hello world",
    });
    expect(result.ok).toBe(true);
    expect(result.text).toContain("Hello world");
  });

  it("renders a prompt without inputs", async () => {
    const result = await renderPrompt("test/fixtures/simple.prompt");
    expect(result.ok).toBe(true);
  });
});

describe("renderPromptSource", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2025-01-15T12:00:00Z") });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders from a source string", async () => {
    const source = `
<Prompt name="inline-test">
  <Ask.Text name="greeting" label="Greeting" required silent />
  Hello {greeting}
</Prompt>`;
    const result = await renderPromptSource(source, { greeting: "world" });
    expect(result.ok).toBe(true);
    expect(result.text).toContain("Hello world");
  });

  it("renders with default filename", async () => {
    const source = `<Prompt name="inline-test">Test content</Prompt>`;
    const result = await renderPromptSource(source);
    expect(result.ok).toBe(true);
  });
});
