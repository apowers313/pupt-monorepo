import { readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createPromptFromSource, render } from "@pupt/lib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = join(__dirname, "..", "..", "prompts");

export async function loadPromptSource(filename) {
  return readFile(join(PROMPTS_DIR, filename), "utf-8");
}

export async function renderPrompt(filename, inputs = {}) {
  const source = await loadPromptSource(filename);
  const element = await createPromptFromSource(source, filename);
  return await render(element, { inputs });
}
