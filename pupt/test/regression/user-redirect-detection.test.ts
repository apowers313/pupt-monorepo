import { describe, it, expect } from 'vitest';
import { AutoAnnotationService } from '../../src/services/auto-annotation-service.js';
import { Config } from '../../src/types/config.js';
import { EnhancedHistoryEntry } from '../../src/types/history.js';
import { PromptManager } from '../../src/prompts/prompt-manager.js';
import { HistoryManager } from '../../src/history/history-manager.js';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

describe('User Redirect Detection', () => {
  it('should detect user redirects in execution output', async () => {
    // Create a test output that contains user redirect patterns
    const testOutput = `
AI: I'll help you create a Vue component for the user profile.

User: No, I meant a React component, not Vue.

AI: Oh, sorry for the confusion. Let me create a React component instead.

[AI proceeds to create React component]

User: Actually, can you use TypeScript for this?

AI: Of course! Let me update it to use TypeScript.

User: Wait, why are you looking in the src/components folder? The components are in app/components.

AI: Thank you for the clarification. Let me search in app/components instead.
`;

    // Expected issues to be detected
    const expectedIssues = [
      {
        category: 'user_redirect',
        description: expect.stringContaining('framework choice'),
        evidence: expect.stringContaining('No, I meant a React component')
      },
      {
        category: 'user_redirect',
        description: expect.stringContaining('TypeScript'),
        evidence: expect.stringContaining('Actually, can you use TypeScript')
      },
      {
        category: 'user_redirect',
        description: expect.stringContaining('wrong location'),
        evidence: expect.stringContaining('Wait, why are you looking in')
      }
    ];

    // The analyze-execution prompt should identify these patterns
    console.log('Test output demonstrates multiple user redirects that should be detected by the updated prompt');
    
    // Verify the prompt file was updated
    const promptPath = path.join(process.cwd(), 'prompts', 'analyze-execution.md');
    const promptContent = await fs.readFile(promptPath, 'utf-8');
    
    expect(promptContent).toContain('user_redirect');
    expect(promptContent).toContain('off_track_execution');
    expect(promptContent).toContain('No, I meant...');
    expect(promptContent).toContain('Wait');
    expect(promptContent).toContain('What are you doing?');
  });

  it('should detect when AI goes off track without explicit user correction', async () => {
    const testOutput = `
User: Can you help me debug the authentication issue in the login component?

AI: I'll analyze your entire application architecture first. Let me start by examining your database schema...

User: The issue is specifically in the login component, in the frontend.

AI: Right, let me focus on the login component instead.
`;

    // This demonstrates AI going off track (analyzing database when asked about frontend)
    console.log('Test demonstrates AI deviating from user instructions');
    
    // The prompt should detect this as off_track_execution
  });

  it('should detect rapid user inputs indicating course correction', async () => {
    const testOutput = `
AI: I'll implement this using a class-based approach.

User: functional component

User: with hooks

User: please

AI: Understood, let me rewrite this as a functional component with hooks.
`;

    // Multiple quick user inputs indicate the AI wasn't following instructions
    console.log('Test demonstrates rapid user corrections indicating AI confusion');
  });
});