/** All component names available in the prompt DSL, grouped by import style. */
const STANDALONE_COMPONENTS = [
  "Prompt",
  "Task",
  "Context",
  "Role",
  "Constraint",
  "Format",
  "Audience",
  "Tone",
  "Section",
  "SuccessCriteria",
  "Criterion",
  "If",
  "ForEach",
  "Code",
  "Data",
  "File",
  "Json",
  "Xml",
  "Example",
  "Examples",
  "ExampleInput",
  "ExampleOutput",
  "Steps",
  "Step",
  "Style",
  "NegativeExample",
  "WhenUncertain",
  "Objective",
  "Guardrails",
  "Specialization",
  "EdgeCases",
  "Fallbacks",
  "Fallback",
  "ChainOfThought",
  "References",
  "Reference",
  "When",
  "Constraints",
  "Contexts",
  "PostExecution",
  "ReviewFile",
  "OpenUrl",
  "RunCommand",
  "Uses",
  "UUID",
  "Timestamp",
  "DateTime",
  "Hostname",
  "Username",
  "Cwd",
  "AskOption",
  "AskLabel",
];

/** Detect which components are used in raw prompt source and build an import line. */
function buildImportLine(raw: string): string {
  // Find standalone components: match <ComponentName (not </ComponentName)
  const used = STANDALONE_COMPONENTS.filter((name) =>
    new RegExp(`<${name}[\\s/>]`).test(raw),
  );

  // Detect Ask.* usage (e.g., <Ask.Text, <Ask.Number)
  const usesAsk = /\bAsk\./.test(raw);
  if (usesAsk) {
    used.push("Ask");
  }

  if (used.length === 0) {
    return "";
  }

  return `import { ${used.join(", ")} } from "@pupt/react";\n`;
}

/** Wrap raw prompt content as a valid .tsx file with imports. */
export function wrapJsx(raw: string): string {
  const importLine = buildImportLine(raw);

  // Indent each line by 2 spaces
  const indented = raw
    .split("\n")
    .map((line) => (line ? `  ${line}` : line))
    .join("\n");

  return `${importLine}\nexport default (\n${indented}\n);\n`;
}

/** Strip imports and `export default (...)` wrapper, returning raw prompt content. */
export function unwrapJsx(source: string): string {
  let text = source.trim();

  // Strip import lines and blank lines before export default
  text = text.replace(/^(import\s+.*\n)*/m, "").trim();

  if (text.startsWith("export default (") && text.endsWith(");")) {
    // Remove wrapper and dedent
    const inner = text.slice("export default (".length, -");".length);
    const lines = inner.replace(/^\n/, "").replace(/\n$/, "").split("\n");
    // Detect common indent (minimum non-empty line indent)
    const indents = lines
      .filter((l) => l.trim().length > 0)
      .map((l) => l.match(/^(\s*)/)?.[1].length ?? 0);
    const minIndent = indents.length > 0 ? Math.min(...indents) : 0;
    return lines.map((l) => l.slice(minIndent)).join("\n");
  }

  return source;
}
