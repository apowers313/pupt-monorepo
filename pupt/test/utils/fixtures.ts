import type { Config } from '../../src/types/config.js';
import type { Prompt } from '../../src/types/prompt.js';
import type { HistoryEntry } from '../../src/types/history.js';

// Sample configurations
export const fixtures = {
  configs: {
    minimal: {
      promptDirectory: ['./.prompts'],
      historyDirectory: './.pthistory'
    } as Config,
    
    complete: {
      promptDirectory: ['./.prompts', './custom-prompts'],
      historyDirectory: './.pthistory',
      editor: 'vim',
      defaultModel: 'gpt-4',
      apiKeys: {
        openai: 'test-key-123'
      },
      version: '2.0.0'
    } as Config,
    
    withMultipleDirectories: {
      promptDirectory: [
        './.prompts',
        './shared-prompts',
        '~/Documents/prompts'
      ],
      historyDirectory: '~/.config/prompt-tool/history'
    } as Config
  },
  
  prompts: {
    simple: {
      name: 'simple-prompt',
      description: 'A simple prompt',
      path: '/prompts/simple-prompt.md',
      content: 'Tell me about {{topic}}.',
      metadata: {}
    } as Prompt,
    
    withInputs: {
      name: 'form-prompt',
      description: 'A prompt with form inputs',
      path: '/prompts/form-prompt.md',
      content: 'Name: {{name}}\nAge: {{age}}\nFavorite: {{favorite}}',
      metadata: {
        inputs: [
          {
            name: 'name',
            type: 'text',
            description: 'Your name',
            required: true
          },
          {
            name: 'age',
            type: 'number',
            description: 'Your age',
            required: false
          },
          {
            name: 'favorite',
            type: 'select',
            description: 'Your favorite',
            options: ['pizza', 'burger', 'salad']
          }
        ]
      }
    } as Prompt,
    
    withComplexTemplate: {
      name: 'complex-template',
      description: 'A prompt with complex templating',
      path: '/prompts/complex-template.md',
      content: `{{#if premium}}
Welcome premium user {{username}}!
{{else}}
Welcome {{username}}!
{{/if}}

{{#each items}}
- {{this.name}}: {{this.price}}
{{/each}}`,
      metadata: {
        model: 'gpt-4',
        temperature: 0.7
      }
    } as Prompt
  },
  
  historyEntries: {
    basic: {
      id: 'entry-001',
      timestamp: '2024-01-01T12:00:00Z',
      promptName: 'simple-prompt',
      model: 'gpt-3.5-turbo',
      variables: {
        topic: 'artificial intelligence'
      },
      output: 'AI is a fascinating field...'
    } as HistoryEntry,
    
    withSensitiveData: {
      id: 'entry-002',
      timestamp: '2024-01-02T14:30:00Z',
      promptName: 'api-prompt',
      model: 'gpt-4',
      variables: {
        endpoint: 'https://api.example.com',
        apiKey: 'sk-1234567890',
        password: 'secret123',
        username: 'john'
      },
      output: 'API call successful'
    } as HistoryEntry,
    
    withAnnotation: {
      id: 'entry-003',
      timestamp: '2024-01-03T09:15:00Z',
      promptName: 'debug-prompt',
      model: 'gpt-3.5-turbo',
      variables: {
        code: 'console.log("test");'
      },
      output: 'The code logs "test" to console',
      annotation: 'This was helpful for debugging issue #123'
    } as HistoryEntry
  },
  
  fileContents: {
    markdownPrompt: `---
name: example-prompt
description: An example prompt file
tags: [example, test]
model: gpt-4
temperature: 0.8
---

# Example Prompt

This is an example prompt for {{subject}}.

## Instructions
{{instructions}}

## Context
{{#if context}}
{{context}}
{{else}}
No additional context provided.
{{/if}}`,
    
    yamlConfig: `promptDirectory:
  - ./.prompts
  - ./templates
historyDirectory: ~/.prompt-tool/history
editor: code
defaultModel: gpt-4
apiKeys:
  openai: \${OPENAI_API_KEY}
  anthropic: \${ANTHROPIC_API_KEY}`,
    
    historyJson: `{
  "id": "hist-001",
  "timestamp": "2024-01-01T00:00:00Z",
  "promptName": "test-prompt",
  "model": "gpt-4",
  "variables": {
    "input": "test"
  },
  "output": "Test response"
}`
  },
  
  errors: {
    fileNotFound: new Error('ENOENT: no such file or directory'),
    invalidJson: new Error('Unexpected token } in JSON at position 10'),
    networkError: new Error('ECONNREFUSED: Connection refused'),
    permissionDenied: new Error('EACCES: permission denied')
  },
  
  paths: {
    unix: {
      home: '/home/user',
      config: '/home/user/.config/prompt-tool',
      prompts: '/home/user/prompts'
    },
    windows: {
      home: 'C:\\Users\\User',
      config: 'C:\\Users\\User\\AppData\\Roaming\\prompt-tool',
      prompts: 'C:\\Users\\User\\Documents\\prompts'
    }
  }
};

// Helper functions for creating test data
export function createPromptFiles() {
  return [
    {
      path: 'basic.md',
      content: 'Basic prompt: {{input}}'
    },
    {
      path: 'subdir/nested.md',
      content: '---\nname: nested\n---\nNested prompt'
    },
    {
      path: 'template.md',
      content: fixtures.fileContents.markdownPrompt
    }
  ];
}

export function createHistoryFiles() {
  return [
    {
      filename: '20240101_120000_simple-prompt.json',
      content: fixtures.historyEntries.basic
    },
    {
      filename: '20240102_143000_api-prompt.json',
      content: fixtures.historyEntries.withSensitiveData
    },
    {
      filename: '20240103_091500_debug-prompt.json',
      content: fixtures.historyEntries.withAnnotation
    }
  ];
}

export function createMockApiResponses() {
  return {
    openai: {
      success: {
        choices: [{
          message: {
            content: 'This is a mock response from OpenAI'
          }
        }]
      },
      error: {
        error: {
          message: 'Invalid API key',
          type: 'invalid_request_error'
        }
      }
    },
    anthropic: {
      success: {
        content: [{
          text: 'This is a mock response from Anthropic'
        }]
      },
      error: {
        error: {
          message: 'Authentication error',
          type: 'authentication_error'
        }
      }
    }
  };
}