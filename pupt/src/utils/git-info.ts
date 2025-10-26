import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface GitInfo {
  branch?: string;
  commit?: string;
  isDirty?: boolean;
}

export async function getGitInfo(): Promise<GitInfo> {
  const info: GitInfo = {};

  try {
    // Get current branch
    const branchResult = await execAsync('git rev-parse --abbrev-ref HEAD');
    info.branch = branchResult.stdout.trim();

    // Get current commit hash
    const commitResult = await execAsync('git rev-parse HEAD');
    info.commit = commitResult.stdout.trim();

    // Check if working directory is dirty
    const statusResult = await execAsync('git status --porcelain');
    info.isDirty = statusResult.stdout.trim().length > 0;
  } catch {
    // Not a git repository or git not available
    // Return partial info - don't throw
  }

  return info;
}

export function formatDuration(startTime: Date, endTime: Date): string {
  const durationMs = endTime.getTime() - startTime.getTime();
  const seconds = Math.floor(durationMs / 1000);
  
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }
  
  return `${hours}h`;
}