import { useState, useEffect, useMemo } from "react";
import { MantineProvider } from "@mantine/core";
import { PuptProvider, PuptLibraryProvider, usePuptLibraryContext } from "pupt-react";
import type { SearchablePrompt } from "pupt-react";
import { theme } from "./theme";
import { Layout } from "./components";
import { DemoProvider } from "./context/DemoContext";
import { parseBuiltinPrompts } from "./data/builtinPrompts";
import type { BuiltinPromptMeta } from "./data/builtinPrompts";

/**
 * Inner component that merges built-in + library prompts for PuptProvider.
 * Must be inside PuptLibraryProvider to access library context.
 */
function AppInner() {
  const { prompts: libraryPrompts } = usePuptLibraryContext();
  const [builtinPrompts, setBuiltinPrompts] = useState<SearchablePrompt[]>([]);
  const [builtinPromptMeta, setBuiltinPromptMeta] = useState<Map<string, BuiltinPromptMeta>>(new Map());

  useEffect(() => {
    parseBuiltinPrompts().then(({ prompts, meta }) => {
      setBuiltinPrompts(prompts);
      setBuiltinPromptMeta(meta);
    });
  }, []);

  // Merge built-in prompts with library-discovered prompts for search indexing
  const allPrompts: SearchablePrompt[] = useMemo(() => {
    const librarySearchable: SearchablePrompt[] = libraryPrompts.map((p) => ({
      name: p.name,
      description: p.description,
      tags: p.tags,
      library: p.library,
    }));
    return [...builtinPrompts, ...librarySearchable];
  }, [builtinPrompts, libraryPrompts]);

  return (
    <PuptProvider prompts={allPrompts}>
      <DemoProvider builtinPromptMeta={builtinPromptMeta}>
        <Layout />
      </DemoProvider>
    </PuptProvider>
  );
}

export function App() {
  return (
    <MantineProvider theme={theme}>
      <PuptLibraryProvider>
        <AppInner />
      </PuptLibraryProvider>
    </MantineProvider>
  );
}
