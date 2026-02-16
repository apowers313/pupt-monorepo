import { useState, useMemo } from "react";
import { Combobox, TextInput, Group, Text, Badge, useCombobox, ScrollArea } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { usePupt, usePromptSearch, usePuptLibraryContext } from "@pupt/react";
import type { SearchablePrompt } from "@pupt/react";
import { useDemoContext } from "../context/DemoContext";
import { wrapJsx } from "../util/jsxWrapper";

interface DisplayPrompt {
  name: string;
  title: string;
  description: string;
  library: string;
  tags: string[];
}

export function PromptSearch() {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });
  const { selectPrompt, builtinPromptMeta } = useDemoContext();
  const { prompts: allIndexedPrompts } = usePupt();
  const { setQuery, results } = usePromptSearch({ debounce: 150 });
  const { prompts: libraryPrompts } = usePuptLibraryContext();
  const [inputValue, setInputValue] = useState("");

  // 100% search-engine-driven display:
  // - Empty query: show all indexed prompts from the search engine context
  // - Non-empty query: show search results from the search engine
  const displayPrompts = useMemo((): DisplayPrompt[] => {
    const hasQuery = inputValue.trim() !== "";

    const toDisplay = (p: SearchablePrompt): DisplayPrompt => {
      const meta = builtinPromptMeta.get(p.name);
      return {
        name: p.name,
        title: meta?.title ?? p.name,
        description: p.description ?? "",
        library: p.library ?? "unknown",
        tags: p.tags ?? [],
      };
    };

    if (!hasQuery) {
      return allIndexedPrompts.map(toDisplay);
    }

    return results.map((r) => toDisplay(r.prompt));
  }, [allIndexedPrompts, results, inputValue, builtinPromptMeta]);

  // Group by library
  const grouped = useMemo(() => {
    const groups = new Map<string, DisplayPrompt[]>();
    for (const p of displayPrompts) {
      const key = p.library;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    }
    return groups;
  }, [displayPrompts]);

  const handleSelect = (name: string) => {
    const prompt = displayPrompts.find((p) => p.name === name);
    if (!prompt) return;

    if (prompt.library === "built-in") {
      // Load source from built-in prompt metadata
      const meta = builtinPromptMeta.get(name);
      if (meta) {
        const needsWrapping = meta.format === "jsx" && !meta.source.includes("export default");
        const source = needsWrapping ? wrapJsx(meta.source) : meta.source;
        selectPrompt({ kind: "source", source, format: meta.format });
      }
    } else {
      // Load element from library prompt
      const libPrompt = libraryPrompts.find((p) => p.name === name);
      if (libPrompt) {
        selectPrompt({ kind: "element", element: libPrompt.element, name: libPrompt.name });
      }
    }

    setInputValue("");
    setQuery("");
    combobox.closeDropdown();
  };

  const options = Array.from(grouped.entries()).map(([library, prompts]) => (
    <Combobox.Group key={library} label={library}>
      {prompts.map((p) => (
        <Combobox.Option key={`${library}-${p.name}`} value={p.name}>
          <Group gap="xs" wrap="nowrap">
            <Text size="sm" fw={500} style={{ whiteSpace: "nowrap" }}>{p.title}</Text>
            {p.description && (
              <Text size="xs" c="dimmed" truncate>{p.description}</Text>
            )}
            {p.library !== "built-in" && p.tags.length > 0 && (
              <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
                {p.tags.slice(0, 2).map((tag) => (
                  <Badge key={tag} size="xs" variant="light">{tag}</Badge>
                ))}
              </Group>
            )}
          </Group>
        </Combobox.Option>
      ))}
    </Combobox.Group>
  ));

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={handleSelect}
    >
      <Combobox.Target>
        <TextInput
          size="xs"
          placeholder="Search prompts..."
          leftSection={<IconSearch size={14} />}
          value={inputValue}
          onChange={(e) => {
            const val = e.currentTarget.value;
            setInputValue(val);
            setQuery(val);
            combobox.openDropdown();
            combobox.resetSelectedOption();
          }}
          onClick={() => combobox.openDropdown()}
          onFocus={() => combobox.openDropdown()}
          onBlur={() => combobox.closeDropdown()}
          styles={{ input: { width: 220 } }}
        />
      </Combobox.Target>

      <Combobox.Dropdown miw={450}>
        <Combobox.Options>
          <ScrollArea.Autosize mah={300}>
            {options.length > 0 ? (
              options
            ) : (
              <Combobox.Empty>No prompts found</Combobox.Empty>
            )}
          </ScrollArea.Autosize>
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}
