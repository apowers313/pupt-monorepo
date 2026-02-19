import { createPromptFromSource, type PuptElement, render,type RenderResult } from "@pupt/lib";
import { readFile } from "fs/promises";
import { resolve } from "path";

export type { TestAllPromptsOptions, TestPromptOptions } from "./types.js";
export type { PuptElement, RenderResult } from "@pupt/lib";

/**
 * Read a .prompt file and return its raw source text.
 *
 * @param promptPath - absolute or relative path to a .prompt file
 * @returns the raw file content as a string
 */
export async function loadPromptSource(promptPath: string): Promise<string> {
  const resolved = resolve(process.cwd(), promptPath);
  return readFile(resolved, "utf-8");
}

/**
 * Read a .prompt file and compile it through pupt-lib's pipeline,
 * returning the PuptElement without rendering it.
 *
 * @param promptPath - absolute or relative path to a .prompt file
 * @returns the compiled PuptElement
 */
export async function compilePrompt(promptPath: string): Promise<PuptElement> {
  const resolved = resolve(process.cwd(), promptPath);
  const source = await readFile(resolved, "utf-8");
  return createPromptFromSource(source, resolved);
}

/**
 * Read, compile, and render a .prompt file with the given inputs.
 *
 * @param promptPath - absolute or relative path to a .prompt file
 * @param inputs - key-value pairs passed to the prompt's input expressions
 * @returns the RenderResult from pupt-lib's render()
 */
export async function renderPrompt(
  promptPath: string,
  inputs: Record<string, unknown> = {},
): Promise<RenderResult> {
  const resolved = resolve(process.cwd(), promptPath);
  const source = await readFile(resolved, "utf-8");
  const element = await createPromptFromSource(source, resolved);
  return render(element, { inputs });
}

/**
 * Compile and render a prompt from a source string.
 *
 * @param source - raw .prompt file content as a string
 * @param inputs - key-value pairs passed to the prompt's input expressions
 * @param filename - optional filename for error messages (defaults to "inline.prompt")
 * @returns the RenderResult from pupt-lib's render()
 */
export async function renderPromptSource(
  source: string,
  inputs: Record<string, unknown> = {},
  filename = "inline.prompt",
): Promise<RenderResult> {
  const element = await createPromptFromSource(source, filename);
  return render(element, { inputs });
}
