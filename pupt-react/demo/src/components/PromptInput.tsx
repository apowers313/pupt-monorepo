import { useMemo } from "react";
import { Stack, Group, Title, Alert } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import Editor, { type BeforeMount } from "@monaco-editor/react";
import { useDemoContext } from "../context/DemoContext";
import { PromptSearch } from "./PromptSearch";

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
  const { activePrompt, setSource } = useDemoContext();

  const isSource = activePrompt.kind === "source";
  const format = isSource ? activePrompt.format : "prompt";

  // Use HTML for both formats — Monaco's Monarch tokenizer has no JSX text
  // awareness and highlights JS keywords (in, is, This) inside tag content.
  const language = "html";
  const path = format === "jsx" ? "prompt.tsx" : "prompt.prompt";

  const editorValue = useMemo(() => {
    return isSource ? activePrompt.source : "";
  }, [isSource, activePrompt]);

  return (
    <Stack h="100%" gap="sm">
      <Group justify="space-between">
        <Title order={4}>Prompt Input</Title>
        <PromptSearch />
      </Group>

      {activePrompt.kind === "element" && (
        <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
          Viewing library prompt: <strong>{activePrompt.name}</strong>.
          This prompt is rendered directly from the library and cannot be edited.
        </Alert>
      )}

      <Editor
        height="60vh"
        language={language}
        path={path}
        value={editorValue}
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
          readOnly: activePrompt.kind === "element",
        }}
      />
    </Stack>
  );
}
