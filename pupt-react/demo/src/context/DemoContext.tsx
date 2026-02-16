import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { createRuntimeConfig } from "pupt-react";
import type { EnvironmentContext, RuntimeConfig, PuptElement } from "pupt-react";
import { DEFAULT_EXAMPLE, type ExampleFormat } from "../data/examples";
import type { BuiltinPromptMeta } from "../data/builtinPrompts";

/**
 * Discriminated union for the currently active prompt.
 * - "source": loaded from source code (editable in editor)
 * - "element": loaded from a library (pre-parsed PuptElement)
 */
export type ActivePrompt =
  | { kind: "source"; source: string; format: ExampleFormat }
  | { kind: "element"; element: PuptElement; name: string };

interface DemoContextValue {
  activePrompt: ActivePrompt;
  selectPrompt: (prompt: ActivePrompt) => void;
  /** Set source directly (for editor changes when kind === "source") */
  setSource: (source: string) => void;
  setFormat: (format: ExampleFormat) => void;
  environmentOverrides: Partial<EnvironmentContext>;
  setEnvironmentOverrides: (overrides: Partial<EnvironmentContext>) => void;
  runtimeSnapshot: RuntimeConfig;
  refreshRuntime: () => void;
  builtinPromptMeta: Map<string, BuiltinPromptMeta>;
}

const DemoContext = createContext<DemoContextValue | null>(null);

export function useDemoContext(): DemoContextValue {
  const ctx = useContext(DemoContext);
  if (!ctx) {
    throw new Error("useDemoContext must be used within a DemoProvider");
  }
  return ctx;
}

interface DemoProviderProps {
  children: ReactNode;
  builtinPromptMeta: Map<string, BuiltinPromptMeta>;
}

export function DemoProvider({ children, builtinPromptMeta }: DemoProviderProps) {
  const [activePrompt, setActivePrompt] = useState<ActivePrompt>({
    kind: "source",
    source: DEFAULT_EXAMPLE.source,
    format: DEFAULT_EXAMPLE.format,
  });
  const [environmentOverrides, setEnvironmentOverrides] = useState<Partial<EnvironmentContext>>({
    output: { format: "unspecified" },
  });
  const [runtimeSnapshot, setRuntimeSnapshot] = useState<RuntimeConfig>(() => createRuntimeConfig());
  const refreshRuntime = useCallback(() => setRuntimeSnapshot(createRuntimeConfig()), []);

  const selectPrompt = useCallback((prompt: ActivePrompt) => {
    setActivePrompt(prompt);
  }, []);

  const setSource = useCallback((source: string) => {
    setActivePrompt((prev) => {
      if (prev.kind === "source") {
        return { ...prev, source };
      }
      // If switching from element to source via editor, default to prompt format
      return { kind: "source", source, format: "prompt" };
    });
  }, []);

  const setFormat = useCallback((format: ExampleFormat) => {
    setActivePrompt((prev) => {
      if (prev.kind === "source") {
        return { ...prev, format };
      }
      return prev;
    });
  }, []);

  return (
    <DemoContext.Provider value={{
      activePrompt, selectPrompt,
      setSource, setFormat,
      environmentOverrides, setEnvironmentOverrides,
      runtimeSnapshot, refreshRuntime,
      builtinPromptMeta,
    }}>
      {children}
    </DemoContext.Provider>
  );
}
