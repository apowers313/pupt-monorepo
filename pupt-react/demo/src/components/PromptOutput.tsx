import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  Stack,
  Group,
  Title,
  Button,
  Alert,
  Center,
  Loader,
  Code,
  ScrollArea,
} from "@mantine/core";
import { IconCopy, IconCheck, IconAlertCircle } from "@tabler/icons-react";
import { PromptRenderer } from "pupt-react";
import { useDemoContext } from "../context/DemoContext";
import { unwrapJsx } from "../util/jsxWrapper";
import { AskInputs } from "./AskInputs";

export function PromptOutput() {
  const { source, format } = useDemoContext();
  const [inputValues, setInputValues] = useState<Map<string, unknown>>(
    () => new Map(),
  );
  const prevSourceRef = useRef(source);

  // Reset inputs when source changes
  useEffect(() => {
    if (source !== prevSourceRef.current) {
      prevSourceRef.current = source;
      setInputValues(new Map());
    }
  }, [source]);

  // Strip JSX wrapper for .jsx format
  const rawSource = useMemo(() => {
    return format === "jsx" ? unwrapJsx(source) : source;
  }, [source, format]);

  const handleInputChange = useCallback((name: string, value: unknown) => {
    setInputValues((prev) => {
      const next = new Map(prev);
      next.set(name, value);
      return next;
    });
  }, []);

  return (
    <PromptRenderer source={rawSource} inputs={inputValues} autoRender>
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
            <Title order={4}>Rendered Output</Title>
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

          {isLoading && (
            <Center py="xl">
              <Loader size="sm" />
            </Center>
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
