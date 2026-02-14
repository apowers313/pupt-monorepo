import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { ConfigManager } from '../config/config-manager.js';
import simpleGit, { SimpleGit } from 'simple-git';
import { logger } from '../utils/logger.js';
import { cosmiconfig } from 'cosmiconfig';
import { getDataDir } from '../config/global-paths.js';
import { GlobalPackageManager } from '../services/package-manager.js';
import type { GitLibraryEntry, NpmLibraryEntry } from '../types/config.js';

export async function loadConfigFromDirectory(dir: string): Promise<string[] | undefined> {
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
  const dataDir = getDataDir();
  const librariesDir = path.join(dataDir, 'libraries');
  const installPath = path.join(librariesDir, repoName);

  // Ensure parent directory exists
  await fs.mkdir(librariesDir, { recursive: true });

  return installPath;
}

export interface InstallFromGitOptions {
  name?: string;
  git?: SimpleGit;
}

export async function installFromGit(url: string, options: InstallFromGitOptions = {}): Promise<void> {
  const git = options.git ?? simpleGit();

  // Validate URL
  validateGitUrl(url);

  // Determine library name
  const libraryName = options.name ?? extractRepoName(url);

  // Load our current config and check for duplicates
  const config = await ConfigManager.load();
  const existingLibrary = config.libraries?.find(lib => lib.name === libraryName);
  if (existingLibrary) {
    throw new Error(`Library "${libraryName}" is already installed. Use "pt update ${libraryName}" to update it.`);
  }

  // Get installation path
  const installPath = await getGitInstallPath(libraryName);

  logger.log(`Installing prompts from ${url}...`);

  // Clone repository with depth 1
  try {
    await git.clone(url, installPath, ['--depth', '1']);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to clone repository: ${errorMessage}`);
  }

  // Try to load the installed package's config to get its promptDirs
  const installedPromptDirs = await loadConfigFromDirectory(installPath);

  // Determine promptDirs for this library
  const promptDirs = installedPromptDirs && installedPromptDirs.length > 0
    ? installedPromptDirs
    : ['prompts'];

  // Get the current commit hash as version
  let version: string | undefined;
  try {
    const libGit = simpleGit(installPath);
    const log = await libGit.log({ maxCount: 1 });
    version = log.latest?.hash?.substring(0, 8);
  } catch {
    // Version is optional, continue without it
  }

  // Create the library entry
  const libraryEntry: GitLibraryEntry = {
    name: libraryName,
    type: 'git',
    source: url,
    promptDirs,
    installedAt: new Date().toISOString(),
    ...(version && { version }),
  };

  // Add library entry to config
  if (!config.libraries) {
    config.libraries = [];
  }
  config.libraries.push(libraryEntry);
  await ConfigManager.save(config);

  logger.log(`Successfully installed library "${libraryName}" from ${url}`);
  promptDirs.forEach(dir => logger.log(`  Prompt directory: ${dir}`));
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

// Install from NPM
export async function installFromNpm(packageName: string): Promise<void> {
  // Validate package name
  validateNpmPackage(packageName);

  const dataDir = getDataDir();
  const packageManager = new GlobalPackageManager(dataDir);

  // Check for duplicate library entries
  const config = await ConfigManager.load();
  const existingLibrary = config.libraries?.find(lib => lib.name === packageName);
  if (existingLibrary) {
    throw new Error(`Package "${packageName}" is already installed. Use "pt update ${packageName}" to update it.`);
  }

  // Install the package
  const info = await packageManager.install(packageName);

  // If prompts were found, add an NpmLibraryEntry to config
  if (info.promptDirs.length > 0) {
    const libraryEntry: NpmLibraryEntry = {
      name: packageName,
      type: 'npm',
      source: packageName,
      promptDirs: info.promptDirs,
      installedAt: new Date().toISOString(),
      version: info.version,
    };

    if (!config.libraries) {
      config.libraries = [];
    }
    config.libraries.push(libraryEntry);
    await ConfigManager.save(config);

    logger.log(`Successfully installed prompts from ${packageName}`);
    info.promptDirs.forEach(dir => logger.log(`  Prompt directory: ${dir}`));
  } else {
    logger.log(`Package ${packageName} installed (no prompt directories found - pure component package)`);
  }
}

export async function installCommand(source: string, options?: { name?: string }): Promise<void> {
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
    await installFromGit(source, { name: options?.name });
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
