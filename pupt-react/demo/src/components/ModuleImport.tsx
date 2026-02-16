import { useState } from "react";
import {
  Modal,
  TextInput,
  Button,
  Group,
  Stack,
  Text,
  ActionIcon,
  Badge,
  Paper,
} from "@mantine/core";
import { IconTrash, IconPlus } from "@tabler/icons-react";
import { usePuptLibraryContext } from "pupt-react";

interface ModuleImportProps {
  opened: boolean;
  onClose: () => void;
}

export function ModuleImport({ opened, onClose }: ModuleImportProps) {
  const { modules, addModule, removeModule, prompts, isLoading } = usePuptLibraryContext();
  const [inputValue, setInputValue] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async () => {
    const source = inputValue.trim();
    if (!source) return;

    setIsAdding(true);
    try {
      await addModule(source);
      setInputValue("");
    } finally {
      setIsAdding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAdd();
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Import Prompt Library" size="md">
      <Stack gap="md">
        <Group gap="xs" align="flex-end">
          <TextInput
            flex={1}
            label="Module source"
            placeholder="npm package name or URL"
            value={inputValue}
            onChange={(e) => setInputValue(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
            disabled={isAdding}
          />
          <Button
            leftSection={<IconPlus size={14} />}
            onClick={handleAdd}
            loading={isAdding}
            disabled={!inputValue.trim()}
          >
            Add
          </Button>
        </Group>

        {modules.length > 0 && (
          <Stack gap="xs">
            <Text size="sm" fw={500}>Loaded modules</Text>
            {modules.map((mod) => {
              const modPrompts = prompts.filter((p) => p.library === mod);
              return (
                <Paper key={mod} p="xs" withBorder>
                  <Group justify="space-between" wrap="nowrap">
                    <div>
                      <Text size="sm">{mod}</Text>
                      <Badge size="xs" variant="light">
                        {modPrompts.length} prompt{modPrompts.length !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      size="sm"
                      onClick={() => removeModule(mod)}
                      aria-label={`Remove ${mod}`}
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Group>
                </Paper>
              );
            })}
          </Stack>
        )}

        {modules.length === 0 && !isLoading && (
          <Text size="sm" c="dimmed" ta="center">
            No modules loaded. Add an npm package name or URL to discover prompts.
          </Text>
        )}

        {isLoading && (
          <Text size="sm" c="dimmed" ta="center">
            Loading modules...
          </Text>
        )}
      </Stack>
    </Modal>
  );
}
