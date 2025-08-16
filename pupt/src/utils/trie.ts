export class TrieNode {
  children: Map<string, TrieNode> = new Map();
  isEndOfPath: boolean = false;
  fullPath: string = '';
}

export class Trie {
  private root: TrieNode = new TrieNode();

  insert(path: string): void {
    let current = this.root;
    
    for (const char of path) {
      if (!current.children.has(char)) {
        current.children.set(char, new TrieNode());
      }
      current = current.children.get(char)!;
    }
    
    current.isEndOfPath = true;
    current.fullPath = path;
  }

  findCompletions(prefix: string): string[] {
    let current = this.root;
    
    // Navigate to the prefix node
    for (const char of prefix) {
      if (!current.children.has(char)) {
        return [];
      }
      current = current.children.get(char)!;
    }
    
    // Collect all paths from this node
    const completions: string[] = [];
    this.collectPaths(current, completions);
    
    return completions;
  }

  private collectPaths(node: TrieNode, paths: string[]): void {
    if (node.isEndOfPath) {
      paths.push(node.fullPath);
    }
    
    for (const child of node.children.values()) {
      this.collectPaths(child, paths);
    }
  }
}

export function findCommonPrefix(strings: string[]): string {
  if (strings.length === 0) return '';
  if (strings.length === 1) return strings[0];
  
  let prefix = '';
  const firstString = strings[0];
  
  for (let i = 0; i < firstString.length; i++) {
    const char = firstString[i];
    
    for (let j = 1; j < strings.length; j++) {
      if (i >= strings[j].length || strings[j][i] !== char) {
        return prefix;
      }
    }
    
    prefix += char;
  }
  
  return prefix;
}

export interface CompletionResult {
  completed: string;
  suggestions: string[];
}

export function completeFilePath(input: string, availablePaths: string[]): CompletionResult {
  // Find all paths that start with the input
  const matches = availablePaths.filter(path => path.startsWith(input));
  
  if (matches.length === 0) {
    // No matches, return original input
    return {
      completed: input,
      suggestions: [],
    };
  }
  
  if (matches.length === 1) {
    // Single match, complete to full path
    return {
      completed: matches[0],
      suggestions: [],
    };
  }
  
  // Multiple matches, complete to common prefix
  const commonPrefix = findCommonPrefix(matches);
  
  return {
    completed: commonPrefix,
    suggestions: matches,
  };
}