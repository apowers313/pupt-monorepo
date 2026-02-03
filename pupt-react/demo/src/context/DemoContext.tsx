import { createContext, useContext, useState, type ReactNode } from "react";
import { DEFAULT_EXAMPLE, type ExampleFormat } from "../data/examples";

interface DemoContextValue {
  source: string;
  setSource: (source: string) => void;
  format: ExampleFormat;
  setFormat: (format: ExampleFormat) => void;
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

  return (
    <DemoContext.Provider value={{ source, setSource, format, setFormat }}>
      {children}
    </DemoContext.Provider>
  );
}
