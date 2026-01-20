import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { ConfigManager } from '../config/config-manager.js';
import { Config } from '../types/config.js';
import fs2 from 'fs-extra';
import simpleGit, { SimpleGit } from 'simple-git';
import { execa } from 'execa';
import { isGitRepository, addToGitignore } from '../utils/gitignore.js';
import { logger } from '../utils/logger.js';
import { cosmiconfig } from 'cosmiconfig';

async function saveConfig(config: Config): Promise<void> {
  const configPath = path.join(process.cwd(), '.pt-config.json');
  await fs2.writeJson(configPath, config, { spaces: 2 });
}

async function loadConfigFromDirectory(dir: string): Promise<string[] | undefined> {
  // Look for config files only in the specific directory (no traversal)
  const explorer = cosmiconfig('pt', {
    searchPlaces: [
      '.pt-config',
      '.pt-config.json',
      '.pt-config.yaml',
      '.pt-config.yml',
      '.pt-config.js',
      '.pt-config.cjs',
      'pt.config.js',
    ],
    stopDir: dir, // Don't search beyond this directory
  });
  
  try {
    const result = await explorer.load(path.join(dir, '.pt-config.json'));
    if (!result) {
      // Try other config file names
      for (const configName of ['.pt-config.yaml', '.pt-config.yml', '.pt-config.js', '.pt-config.cjs', 'pt.config.js', '.pt-config']) {
        const configPath = path.join(dir, configName);
        try {
          const result = await explorer.load(configPath);
          if (result && result.config && result.config.promptDirs) {
            return result.config.promptDirs;
          }
        } catch {
          // Continue to next file
        }
      }
    } else if (result.config && result.config.promptDirs) {
      return result.config.promptDirs;
    }
  } catch {
    // No config found
  }
  
  return undefined;
}

export function validateGitUrl(url: string): void {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    throw new Error('Invalid URL: URL cannot be empty');
  }

  // Support common git URL formats
  const gitUrlPatterns = [
    // HTTPS URLs
    /^https:\/\/[a-zA-Z0-9.-]+\/[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+(?:\.git)?$/,
    // SSH URLs (git@)
    /^git@[a-zA-Z0-9.-]+:[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+(?:\.git)?$/,
    // SSH URLs (ssh://)
    /^ssh:\/\/git@[a-zA-Z0-9.-]+\/[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+(?:\.git)?$/,
    // Git protocol
    /^git:\/\/[a-zA-Z0-9.-]+\/[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+(?:\.git)?$/,
    // File protocol (for testing and local repos)
    /^file:\/\/\/.+$/
  ];

  const isValidGitUrl = gitUrlPatterns.some(pattern => pattern.test(url));

  if (!isValidGitUrl) {
    throw new Error(`Invalid git URL format: ${url}`);
  }
}

export function extractRepoName(url: string): string {
  // Remove .git suffix if present
  const cleanUrl = url.replace(/\.git$/, '');
  
  // Extract repo name from different URL formats
  let repoName: string;
  
  if (url.includes('://')) {
    // HTTPS, git://, or file:// URLs
    const parts = cleanUrl.split('/');
    repoName = parts[parts.length - 1];
    
    // For file:// URLs that might end with a slash
    if (!repoName && parts.length > 1) {
      repoName = parts[parts.length - 2];
    }
  } else if (url.startsWith('git@')) {
    // SSH URLs (git@host:user/repo)
    const parts = cleanUrl.split(':')[1].split('/');
    repoName = parts[parts.length - 1];
  } else {
    throw new Error(`Cannot extract repository name from URL: ${url}`);
  }

  if (!repoName) {
    throw new Error(`Cannot extract repository name from URL: ${url}`);
  }

  return repoName;
}


async function getGitInstallPath(repoName: string): Promise<string> {
  const config = await ConfigManager.load();
  const gitPromptDir = config.gitPromptDir || '.git-prompts';
  const installPath = path.join(gitPromptDir, repoName);
  
  // Ensure parent directory exists
  await fs.mkdir(gitPromptDir, { recursive: true });
  
  return installPath;
}

export async function installFromGit(url: string, git: SimpleGit = simpleGit()): Promise<void> {
  // Validate URL
  validateGitUrl(url);
  
  // Extract repository name
  const repoName = extractRepoName(url);
  
  // Get installation path
  const installPath = await getGitInstallPath(repoName);
  
  logger.log(`Installing prompts from ${url}...`);
  
  // Clone repository with depth 1
  try {
    await git.clone(url, installPath, ['--depth', '1']);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to clone repository: ${errorMessage}`);
  }
  
  // Update .gitignore if in git repository
  if (await isGitRepository()) {
    const config = await ConfigManager.load();
    await addToGitignore(config.gitPromptDir || '.git-prompts');
  }
  
  // Try to load the installed package's config to get its promptDirs
  const installedPromptDirs = await loadConfigFromDirectory(installPath);
  
  // Load our current config
  const config = await ConfigManager.load();
  
  // Add the installed package's promptDirs to our config
  let addedPaths: string[] = [];
  if (installedPromptDirs && installedPromptDirs.length > 0) {
    for (const promptDir of installedPromptDirs) {
      // Make the path relative to the install location
      const fullPath = path.isAbsolute(promptDir) 
        ? promptDir 
        : path.join(installPath, promptDir);
      
      if (!config.promptDirs.includes(fullPath)) {
        config.promptDirs.push(fullPath);
        addedPaths.push(fullPath);
      }
    }
    
    if (addedPaths.length > 0) {
      await saveConfig(config);
      logger.log(`Successfully installed prompts from ${url}`);
      addedPaths.forEach(p => logger.log(`Added prompt directory: ${p}`));
    } else {
      logger.log(`Prompts from ${url} already configured`);
    }
  } else {
    // Fallback to default prompts directory if no promptDirs in config
    const promptPath = path.join(installPath, 'prompts');
    
    if (!config.promptDirs.includes(promptPath)) {
      config.promptDirs.push(promptPath);
      await saveConfig(config);
      logger.log(`Successfully installed prompts to ${promptPath}`);
    } else {
      logger.log(`Prompts already installed at ${promptPath}`);
    }
  }
}

// NPM Package Detection
export function isNpmPackage(source: string): boolean {
  if (!source || typeof source !== 'string' || source.trim() === '') {
    return false;
  }

  // Reject obvious non-package patterns
  if (source.includes('://') || // URLs
      source.includes(':') && source.includes('@') || // SSH URLs
      source.startsWith('./') || source.startsWith('../') || // Relative paths
      source.startsWith('/') || // Absolute paths
      source.includes('\\') || // Windows paths
      source.includes(' ') || // Spaces
      source.startsWith('-') || source.startsWith('.') || source.startsWith('_')) { // Invalid starts
    return false;
  }

  // Check for valid npm package name patterns
  // Regular packages: alphanumeric, dash, underscore, dot
  // Scoped packages: @scope/package
  const npmPackagePattern = /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/i;
  
  // Additional validation for scoped packages
  if (source.startsWith('@')) {
    const parts = source.split('/');
    if (parts.length !== 2 || parts[0] === '@' || parts[1] === '') {
      return false;
    }
  }
  
  return npmPackagePattern.test(source);
}

export function validateNpmPackage(packageName: string): void {
  if (!packageName || packageName.trim() === '') {
    throw new Error('Package name cannot be empty');
  }

  if (!isNpmPackage(packageName)) {
    throw new Error(`Invalid npm package name: ${packageName}`);
  }
}

// Check if current directory is an npm project
export async function isNpmProject(): Promise<boolean> {
  try {
    await fs.access('package.json');
    return true;
  } catch {
    return false;
  }
}

// Package manager types and detection
export type PackageManager = 'npm' | 'pnpm' | 'yarn';

export interface PackageManagerConfig {
  command: string;
  installArgs: string[];
}

const PACKAGE_MANAGER_CONFIGS: Record<PackageManager, PackageManagerConfig> = {
  pnpm: { command: 'pnpm', installArgs: ['add', '-D'] },
  yarn: { command: 'yarn', installArgs: ['add', '-D'] },
  npm: { command: 'npm', installArgs: ['install', '--save-dev'] },
};

// Detect package manager by checking for lock files
export async function detectPackageManager(): Promise<PackageManager> {
  // Check in order of specificity
  try {
    await fs.access('pnpm-lock.yaml');
    return 'pnpm';
  } catch {
    // Not pnpm
  }

  try {
    await fs.access('yarn.lock');
    return 'yarn';
  } catch {
    // Not yarn
  }

  // Default to npm (works with package-lock.json or no lock file)
  return 'npm';
}

// Install from NPM
export async function installFromNpm(packageName: string): Promise<void> {
  // Validate package name
  validateNpmPackage(packageName);

  // Check if we're in an npm project
  if (!await isNpmProject()) {
    throw new Error('NPM package installation requires a package.json file. Run "npm init" first.');
  }

  // Detect the appropriate package manager
  const packageManager = await detectPackageManager();
  const pmConfig = PACKAGE_MANAGER_CONFIGS[packageManager];

  logger.log(`Installing ${packageName} using ${packageManager}...`);

  try {
    // Install the package as a dev dependency using the detected package manager
    await execa(pmConfig.command, [...pmConfig.installArgs, packageName], {
      stdio: 'inherit' // Show output to user
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to install package with ${packageManager}: ${errorMessage}`);
  }
  
  // Get installed package path
  const packagePath = path.join('node_modules', packageName);
  
  // Try to load the installed package's config to get its promptDirs
  const installedPromptDirs = await loadConfigFromDirectory(packagePath);
  
  // Load our current config
  const config = await ConfigManager.load();
  
  // Add the installed package's promptDirs to our config
  let addedPaths: string[] = [];
  if (installedPromptDirs && installedPromptDirs.length > 0) {
    for (const promptDir of installedPromptDirs) {
      // Make the path relative to the package location
      const fullPath = path.isAbsolute(promptDir) 
        ? promptDir 
        : path.join(packagePath, promptDir);
      
      if (!config.promptDirs.includes(fullPath)) {
        config.promptDirs.push(fullPath);
        addedPaths.push(fullPath);
      }
    }
    
    if (addedPaths.length > 0) {
      await saveConfig(config);
      logger.log(`Successfully installed prompts from ${packageName}`);
      addedPaths.forEach(p => logger.log(`Added prompt directory: ${p}`));
    } else {
      logger.log(`Prompts from ${packageName} already configured`);
    }
  } else {
    // Fallback to reading package.json or default prompts directory
    let promptDir = 'prompts'; // Default prompt directory
    
    try {
      // Read package.json to check for promptDir field
      const packageJsonPath = path.join(packagePath, 'package.json');
      const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageJsonContent);
      
      if (packageJson.promptDir) {
        promptDir = packageJson.promptDir;
      }
    } catch {
      // If we can't read package.json, use default
    }
    
    const fullPromptPath = path.join(packagePath, promptDir);
    
    if (!config.promptDirs.includes(fullPromptPath)) {
      config.promptDirs.push(fullPromptPath);
      await saveConfig(config);
      logger.log(`Successfully installed prompts from ${packageName}`);
      logger.log(`Added prompt directory: ${fullPromptPath}`);
    } else {
      logger.log(`Prompts from ${packageName} already configured at ${fullPromptPath}`);
    }
  }
}

export async function installCommand(source: string): Promise<void> {
  if (!source) {
    throw new Error('Please provide a git URL or npm package name to install from');
  }
  
  // Try npm first (since it's simpler to detect)
  if (isNpmPackage(source)) {
    await installFromNpm(source);
    return;
  }
  
  // Try git URL
  try {
    validateGitUrl(source);
    await installFromGit(source);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('Invalid git URL')) {
      logger.error(`Error: "${source}" is neither a valid git URL nor an npm package name`);
      logger.error('\nExamples of valid sources:');
      logger.error('  Git:  https://github.com/user/repo');
      logger.error('  NPM:  @org/package or package-name');
      throw new Error(`Invalid installation source: ${source}`);
    } else {
      throw error;
    }
  }
}