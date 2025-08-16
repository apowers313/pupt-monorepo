import {
  createPrompt,
  useState,
  useKeypress,
  usePrefix,
  isEnterKey,
  isBackspaceKey,
  makeTheme,
  type Theme,
} from '@inquirer/core';
import type { PartialDeep } from '@inquirer/type';
import chalk from 'chalk';
import path from 'path';
import {
  listFilesWithCache,
  sortFilesByModTime,
  filterFilesByPattern,
  expandPath,
  resolveFilePath,
} from '../../utils/file-utils.js';
import { Trie, completeFilePath } from '../../utils/trie.js';

export interface FilePromptConfig {
  message: string;
  basePath?: string;
  filter?: string;
  default?: string;
  theme?: PartialDeep<Theme>;
}

export const filePrompt = createPrompt<string, FilePromptConfig>((config, done) => {
  const { message, basePath = './', filter = '', default: defaultValue = '' } = config;
  const theme = makeTheme(config.theme);
  const prefix = usePrefix({ theme });

  const [input, setInput] = useState(defaultValue);
  const [cursorPosition, setCursorPosition] = useState(defaultValue.length);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const getCurrentPath = () => {
    const expandedInput = expandPath(input);
    const resolvedPath = resolveFilePath(expandedInput, basePath);
    
    // If input ends with a separator, it's a directory
    if (input.endsWith(path.sep)) {
      return resolvedPath;
    }
    
    // Otherwise, use the directory part of the path
    const dirPath = path.dirname(resolvedPath);
    // Ensure we have a valid path
    return dirPath || basePath;
  };

  const getBaseName = () => {
    if (input.endsWith(path.sep)) {
      return '';
    }
    return path.basename(input);
  };

  useKeypress((key) => {
    if (isEnterKey(key)) {
      if (suggestions.length > 0 && selectedSuggestion >= 0) {
        // Use selected suggestion
        const selected = suggestions[selectedSuggestion];
        let newPath: string;
        
        // If input ends with a separator, we're in a directory
        if (input.endsWith(path.sep)) {
          newPath = input + selected;
        } else {
          const currentDir = path.dirname(input);
          newPath = currentDir === '.' ? selected : path.join(currentDir, selected);
        }
        
        const expandedPath = expandPath(newPath);
        const finalPath = resolveFilePath(expandedPath, basePath);
        done(finalPath);
      } else {
        // Submit current input
        const expandedInput = expandPath(input);
        const finalPath = resolveFilePath(expandedInput, basePath);
        done(finalPath);
      }
    } else if (key.name === 'tab') {
      // Tab completion
      try {
        const currentPath = getCurrentPath();
        if (!currentPath) {
          throw new Error('Invalid path');
        }
        const files = listFilesWithCache(currentPath);
        const sortedFiles = sortFilesByModTime(files);
        const filteredFiles = filter ? filterFilesByPattern(sortedFiles, filter) : sortedFiles;
        
        // Build trie with file names
        const trie = new Trie();
        const fileNames = filteredFiles.map(f => f.isDirectory ? f.name + path.sep : f.name);
        fileNames.forEach(name => trie.insert(name));
        
        // Complete based on current input
        const baseName = getBaseName();
        const result = completeFilePath(baseName, fileNames);
        
        if (result.suggestions.length === 0 && result.completed !== baseName) {
          // Single match - complete it
          const currentDir = path.dirname(input);
          const completed = currentDir === '.' ? result.completed : path.join(currentDir, result.completed);
          setInput(completed);
          setCursorPosition(completed.length);
          setSuggestions([]);
        } else if (result.suggestions.length > 0) {
          // Multiple matches - show suggestions
          setSuggestions(result.suggestions);
          setSelectedSuggestion(0);
          
          // Complete to common prefix
          if (result.completed !== baseName) {
            const currentDir = path.dirname(input);
            const completed = currentDir === '.' ? result.completed : path.join(currentDir, result.completed);
            setInput(completed);
            setCursorPosition(completed.length);
          }
        }
        
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error listing files');
      }
    } else if (key.name === 'up' && suggestions.length > 0) {
      setSelectedSuggestion(Math.max(0, selectedSuggestion - 1));
    } else if (key.name === 'down' && suggestions.length > 0) {
      setSelectedSuggestion(Math.min(suggestions.length - 1, selectedSuggestion + 1));
    } else if (key.name === 'escape') {
      setSuggestions([]);
      setSelectedSuggestion(0);
    } else if (isBackspaceKey(key)) {
      if (cursorPosition > 0) {
        const newInput = input.slice(0, cursorPosition - 1) + input.slice(cursorPosition);
        setInput(newInput);
        setCursorPosition(cursorPosition - 1);
        setSuggestions([]);
        setSelectedSuggestion(0);
      }
    } else if (key.name === 'left') {
      setCursorPosition(Math.max(0, cursorPosition - 1));
    } else if (key.name === 'right') {
      setCursorPosition(Math.min(input.length, cursorPosition + 1));
    } else if (key.name === 'home') {
      setCursorPosition(0);
    } else if (key.name === 'end') {
      setCursorPosition(input.length);
    } else if (key.name && !key.ctrl && key.name.length === 1) {
      // Regular character input
      const newInput = input.slice(0, cursorPosition) + key.name + input.slice(cursorPosition);
      setInput(newInput);
      setCursorPosition(cursorPosition + 1);
      setSuggestions([]);
      setSelectedSuggestion(0);
    }
  });

  // Build display
  let display = `${prefix} ${theme.style.message(message, 'idle')} `;
  
  // Show input with cursor
  const beforeCursor = input.slice(0, cursorPosition);
  const afterCursor = input.slice(cursorPosition);
  const inputDisplay = theme.style.answer(beforeCursor + '│' + afterCursor);
  
  display += inputDisplay;
  
  if (error) {
    display += '\n' + theme.style.error(`  ! ${error}`);
  }
  
  if (suggestions.length > 0) {
    display += '\n' + chalk.dim('  Suggestions:');
    suggestions.forEach((suggestion, index) => {
      const isSelected = index === selectedSuggestion;
      const marker = isSelected ? '❯' : ' ';
      const text = isSelected 
        ? theme.style.highlight(suggestion)
        : chalk.dim(suggestion);
      display += '\n  ' + marker + ' ' + text;
    });
    display += '\n' + chalk.dim('  (Use ↑↓ to navigate, Tab to complete, Enter to select)');
  }

  return display;
});

export default filePrompt;