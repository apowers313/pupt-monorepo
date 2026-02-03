import { Stack, Group, Title } from "@mantine/core";
import Editor, { type BeforeMount } from "@monaco-editor/react";
import { useDemoContext } from "../context/DemoContext";
import { ExamplePicker } from "./ExamplePicker";
import { wrapJsx } from "../util/jsxWrapper";
import type { ExampleFormat } from "../data/examples";

const handleEditorWillMount: BeforeMount = (monaco) => {
  // Configure TypeScript to support JSX without errors
  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ES2020,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
    allowJs: true,
    strict: false,
    noEmit: true,
    esModuleInterop: true,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    allowNonTsExtensions: true,
  });

  // Suppress all diagnostics for the editor since this is a DSL
  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: true,
    noSyntaxValidation: false,
  });
};

export function PromptInput() {
  const { source, setSource, format, setFormat } = useDemoContext();

  // Use HTML for both formats — Monaco's Monarch tokenizer has no JSX text
  // awareness and highlights JS keywords (in, is, This) inside tag content.
  // See: https://github.com/microsoft/monaco-editor/issues/264
  const language = "html";
  const path = format === "jsx" ? "prompt.tsx" : "prompt.prompt";

  const handleExampleSelect = (raw: string, exampleFormat: ExampleFormat) => {
    // For .tsx examples that don't already have exports, wrap with imports
    // Full .tsx examples (with functions/variables) already include exports
    const needsWrapping = exampleFormat === "jsx" && !raw.includes("export default");
    setSource(needsWrapping ? wrapJsx(raw) : raw);
    setFormat(exampleFormat);
  };

  return (
    <Stack h="100%" gap="sm">
      <Group justify="space-between">
        <Title order={4}>Prompt Input</Title>
        <ExamplePicker onSelect={handleExampleSelect} />
      </Group>
      <Editor
        height="60vh"
        language={language}
        path={path}
        value={source}
        onChange={(value) => setSource(value ?? "")}
        theme="vs-dark"
        beforeMount={handleEditorWillMount}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
        }}
      />
    </Stack>
  );
}
