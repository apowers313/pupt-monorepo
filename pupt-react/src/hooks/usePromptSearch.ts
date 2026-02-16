/**
 * usePromptSearch hook - Search through indexed prompts with debouncing
 */

import { useState, useCallback, useEffect, useRef } from "react";
import type { SearchResult } from "pupt-lib";
import { usePupt } from "./usePupt";
import type {
  UsePromptSearchOptions,
  UsePromptSearchReturn,
} from "../types/hooks";

const DEFAULT_DEBOUNCE = 200;

/**
 * Hook for searching through prompts indexed in the PuptProvider.
 *
 * Uses the search engine from PuptContext and provides debounced searching
 * with query state management.
 *
 * @param options - Configuration including debounce delay and result limit
 * @returns Object containing query state, results, and search controls
 *
 * @example
 * ```tsx
 * function SearchBar() {
 *   const { query, setQuery, results, isSearching } = usePromptSearch();
 *
 *   return (
 *     <div>
 *       <input value={query} onChange={e => setQuery(e.target.value)} />
 *       {isSearching && <span>Searching...</span>}
 *       <ul>{results.map(r => <li key={r.prompt.name}>{r.prompt.name}</li>)}</ul>
 *     </div>
 *   );
 * }
 * ```
 */
export function usePromptSearch(
  options: UsePromptSearchOptions = {}
): UsePromptSearchReturn {
  const { debounce = DEFAULT_DEBOUNCE, limit } = options;
  const { searchEngine } = usePupt();

  const [query, setQueryState] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Perform the actual search
  const performSearch = useCallback(
    (searchQuery: string) => {
      if (!searchEngine || searchQuery.trim() === "") {
        setResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const searchOptions = limit !== undefined ? { limit } : {};
        const searchResults = searchEngine.search(searchQuery, searchOptions);
        setResults(searchResults);
      } finally {
        setIsSearching(false);
      }
    },
    [searchEngine, limit]
  );

  // Set query with debouncing
  const setQuery = useCallback(
    (newQuery: string) => {
      setQueryState(newQuery);

      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      if (newQuery.trim() === "") {
        setResults([]);
        setIsSearching(false);
        return;
      }

      if (debounce <= 0) {
        performSearch(newQuery);
      } else {
        setIsSearching(true);
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          performSearch(newQuery);
        }, debounce);
      }
    },
    [debounce, performSearch]
  );

  // Clear search
  const clear = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setQueryState("");
    setResults([]);
    setIsSearching(false);
  }, []);

  // Get all tags
  const allTags = searchEngine ? searchEngine.getAllTags() : [];

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return {
    query,
    setQuery,
    results,
    isSearching,
    allTags,
    clear,
  };
}
