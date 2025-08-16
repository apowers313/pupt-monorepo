import { spawn } from 'child_process';
import { promisify } from 'util';
import { execFile } from 'child_process';

const execFileAsync = promisify(execFile);

export interface EditorLauncher {
  findEditor(): Promise<string | null>;
  isEditorAvailable(editor: string): Promise<boolean>;
  openInEditor(editor: string, filepath: string): Promise<void>;
}

export class DefaultEditorLauncher implements EditorLauncher {
  private static readonly COMMON_EDITORS = [
    'code',
    'vim',
    'nano',
    'emacs',
    'subl',
    'atom',
    'gedit',
    'notepad'
  ];

  async findEditor(): Promise<string | null> {
    // Check environment variables first
    const envEditor = process.env.VISUAL || process.env.EDITOR;
    if (envEditor && await this.isEditorAvailable(envEditor)) {
      return envEditor;
    }

    // Try common editors
    for (const editor of DefaultEditorLauncher.COMMON_EDITORS) {
      if (await this.isEditorAvailable(editor)) {
        return editor;
      }
    }

    return null;
  }

  async isEditorAvailable(editor: string): Promise<boolean> {
    try {
      if (process.platform === 'win32') {
        await execFileAsync('where', [editor]);
      } else {
        await execFileAsync('which', [editor]);
      }
      return true;
    } catch {
      return false;
    }
  }

  async openInEditor(editor: string, filepath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(editor, [filepath], {
        detached: true,
        stdio: 'ignore'
      });

      child.on('error', reject);
      child.on('exit', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Editor exited with code ${code}`));
        }
      });

      child.unref();
    });
  }
}

export const editorLauncher = new DefaultEditorLauncher();