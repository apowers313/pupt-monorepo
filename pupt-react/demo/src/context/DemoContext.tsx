import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { createRuntimeConfig } from "pupt-lib";
import type { EnvironmentContext, RuntimeConfig } from "pupt-lib";
import { DEFAULT_EXAMPLE, type ExampleFormat } from "../data/examples";

interface DemoContextValue {
  source: string;
  setSource: (source: string) => void;
  format: ExampleFormat;
  setFormat: (format: ExampleFormat) => void;
  environmentOverrides: Partial<EnvironmentContext>;
  setEnvironmentOverrides: (overrides: Partial<EnvironmentContext>) => void;
  runtimeSnapshot: RuntimeConfig;
  refreshRuntime: () => void;
}

const DemoContext = createContext<DemoContextValue | null>(null);

export function useDemoContext(): DemoContextValue {
  const ctx = useContext(DemoContext);
  if (!ctx) {
    throw new Error("useDemoContext must be used within a DemoProvider");
  }
  return ctx;
}

export function DemoProvider({ children }: { children: ReactNode }) {
  // Initialize with the default example's source and format
  const [source, setSource] = useState(DEFAULT_EXAMPLE.source);
  const [format, setFormat] = useState<ExampleFormat>(DEFAULT_EXAMPLE.format);
  const [environmentOverrides, setEnvironmentOverrides] = useState<Partial<EnvironmentContext>>({
    output: { format: "unspecified" },
  });
  const [runtimeSnapshot, setRuntimeSnapshot] = useState<RuntimeConfig>(() => createRuntimeConfig());
  const refreshRuntime = useCallback(() => setRuntimeSnapshot(createRuntimeConfig()), []);

  return (
    <DemoContext.Provider value={{
      source, setSource,
      format, setFormat,
      environmentOverrides, setEnvironmentOverrides,
      runtimeSnapshot, refreshRuntime,
    }}>
      {children}
    </DemoContext.Provider>
  );
}
