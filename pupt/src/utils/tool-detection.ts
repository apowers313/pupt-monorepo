import { sync as commandExistsSync } from 'command-exists';

interface ToolConfig {
  name: string;
  displayName: string;
  command: string;
  defaultArgs: string[];
  defaultOptions: Record<string, string>;
}

export const SUPPORTED_TOOLS: ToolConfig[] = [
  {
    name: 'claude',
    displayName: 'Claude',
    command: 'claude',
    defaultArgs: ['--permission-mode', 'acceptEdits'],
    defaultOptions: {
      'Continue with last context?': '--continue'
    }
  },
  {
    name: 'kiro',
    displayName: 'Kiro',
    command: 'kiro-cli',
    defaultArgs: [],
    defaultOptions: {}
  }
];

export function detectInstalledTools(): ToolConfig[] {
  const installedTools: ToolConfig[] = [];

  for (const tool of SUPPORTED_TOOLS) {
    if (commandExistsSync(tool.command)) {
      installedTools.push(tool);
    }
  }

  return installedTools;
}

export function getToolByName(name: string): ToolConfig | undefined {
  return SUPPORTED_TOOLS.find(tool => tool.name === name);
}

/**
 * Tools that are interactive TUIs requiring TTY access.
 * These receive prompts as positional arguments instead of stdin.
 */
const INTERACTIVE_TUI_TOOLS = ['claude', 'kiro-cli'];

export function isInteractiveTUI(tool: string): boolean {
  return INTERACTIVE_TUI_TOOLS.includes(tool);
}