import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  Stack,
  Group,
  Title,
  Button,
  Alert,
  Loader,
  Code,
  ScrollArea,
} from "@mantine/core";
import { IconCopy, IconCheck, IconAlertCircle } from "@tabler/icons-react";
import { PromptRenderer } from "@pupt/react";
import type { PromptSource } from "@pupt/react";
import { useDemoContext } from "../context/DemoContext";
import { AskInputs } from "./AskInputs";

export function PromptOutput() {
  const { activePrompt, environmentOverrides } = useDemoContext();
  const [inputValues, setInputValues] = useState<Map<string, unknown>>(
    () => new Map(),
  );
  const prevPromptRef = useRef(activePrompt);

  // Reset inputs when prompt changes
  useEffect(() => {
    if (activePrompt !== prevPromptRef.current) {
      prevPromptRef.current = activePrompt;
      setInputValues(new Map());
    }
  }, [activePrompt]);

  // Compute PromptSource from the active prompt
  const promptSource: PromptSource = useMemo(() => {
    if (activePrompt.kind === "element") {
      return { type: "element", value: activePrompt.element };
    }
    return { type: "source", value: activePrompt.source };
  }, [activePrompt]);

  // Determine filename for source transformation:
  // .prompt format gets auto-injected imports, .jsx/.tsx is a full module
  const filename = activePrompt.kind === "source"
    ? activePrompt.format === "jsx" ? "prompt.tsx" : "prompt.prompt"
    : undefined;

  const handleInputChange = useCallback((name: string, value: unknown) => {
    setInputValues((prev) => {
      const next = new Map(prev);
      next.set(name, value);
      return next;
    });
  }, []);

  return (
    <PromptRenderer
      source={promptSource}
      inputs={inputValues}
      environment={environmentOverrides}
      filename={filename}
      autoRender
    >
      {({
        output,
        error,
        isLoading,
        pendingInputs,
        copyToClipboard,
        isCopied,
      }) => (
        <Stack h="100%" gap="sm">
          <Group justify="space-between">
            <Group gap="xs">
              <Title order={4}>Rendered Output</Title>
              {isLoading && <Loader size="xs" />}
            </Group>
            {output && (
              <Button
                variant="light"
                size="xs"
                leftSection={
                  isCopied ? (
                    <IconCheck size={14} />
                  ) : (
                    <IconCopy size={14} />
                  )
                }
                color={isCopied ? "green" : undefined}
                onClick={copyToClipboard}
              >
                {isCopied ? "Copied!" : "Copy"}
              </Button>
            )}
          </Group>

          {error && (
            <Alert
              color="red"
              icon={<IconAlertCircle size={16} />}
              title="Error"
            >
              {error.message}
            </Alert>
          )}

          {pendingInputs.length > 0 && (
            <AskInputs
              requirements={pendingInputs}
              values={inputValues}
              onChange={handleInputChange}
            />
          )}

          <ScrollArea flex={1} data-testid="rendered-output">
            {output && <Code block>{output}</Code>}
          </ScrollArea>
        </Stack>
      )}
    </PromptRenderer>
  );
}
