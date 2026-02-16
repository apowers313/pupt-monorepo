import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import fs2 from 'fs-extra';
import { execa } from 'execa';
import { cosmiconfig } from 'cosmiconfig';
import { logger } from '../utils/logger.js';

export interface InstalledPackageInfo {
  name: string;
  version: string;
  promptDirs: string[];
}

export class GlobalPackageManager {
  private packagesDir: string;

  constructor(dataDir: string) {
    this.packagesDir = path.join(dataDir, 'packages');
  }

  getPackagesDir(): string {
    return this.packagesDir;
  }

  getNodeModulesDir(): string {
    return path.join(this.packagesDir, 'node_modules');
  }

  async ensureInitialized(): Promise<void> {
    await fs2.ensureDir(this.packagesDir);
    const pkgJsonPath = path.join(this.packagesDir, 'package.json');
    if (!await fs2.pathExists(pkgJsonPath)) {
      await fs2.writeJson(pkgJsonPath, {
        name: 'pupt-packages',
        private: true,
        dependencies: {},
      }, { spaces: 2 });
    }
  }

  async install(packageSpec: string): Promise<InstalledPackageInfo> {
    await this.ensureInitialized();

    logger.log(`Installing ${packageSpec}...`);

    try {
      await execa('npm', ['install', packageSpec], {
        cwd: this.packagesDir,
        stdio: 'inherit',
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to install package: ${errorMessage}`);
    }

    const version = await this.getInstalledVersion(packageSpec) ?? 'unknown';
    const promptDirs = await this.detectPromptDirs(packageSpec);

    return { name: packageSpec, version, promptDirs };
  }

  async update(packageName?: string): Promise<void> {
    await this.ensureInitialized();

    const args = packageName
      ? ['update', packageName]
      : ['update'];

    try {
      await execa('npm', args, {
        cwd: this.packagesDir,
        stdio: 'inherit',
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to update package${packageName ? ` "${packageName}"` : 's'}: ${errorMessage}`);
    }
  }

  async uninstall(packageName: string): Promise<void> {
    await this.ensureInitialized();

    try {
      await execa('npm', ['uninstall', packageName], {
        cwd: this.packagesDir,
        stdio: 'inherit',
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to uninstall package "${packageName}": ${errorMessage}`);
    }
  }

  async getInstalledVersion(packageName: string): Promise<string | null> {
    const packagePath = path.join(this.packagesDir, 'node_modules', packageName, 'package.json');
    try {
      const content = await fs.readFile(packagePath, 'utf-8');
      const pkg = JSON.parse(content);
      return pkg.version ?? null;
    } catch {
      return null;
    }
  }

  async detectPromptDirs(packageName: string): Promise<string[]> {
    const packagePath = path.join(this.packagesDir, 'node_modules', packageName);

    // 1. Check for .pt-config.json in the package
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
      stopDir: packagePath,
    });

    try {
      const result = await explorer.load(path.join(packagePath, '.pt-config.json'));
      if (result?.config?.promptDirs) {
        return result.config.promptDirs;
      }
    } catch {
      // Try other formats
      for (const configName of ['.pt-config.yaml', '.pt-config.yml', '.pt-config.js', '.pt-config.cjs', 'pt.config.js', '.pt-config']) {
        try {
          const result = await explorer.load(path.join(packagePath, configName));
          if (result?.config?.promptDirs) {
            return result.config.promptDirs;
          }
        } catch {
          // Continue
        }
      }
    }

    // 2. Check package.json pupt.promptDirs field
    try {
      const pkgJsonPath = path.join(packagePath, 'package.json');
      const content = await fs.readFile(pkgJsonPath, 'utf-8');
      const pkg = JSON.parse(content);
      if (pkg.pupt?.promptDirs && Array.isArray(pkg.pupt.promptDirs)) {
        return pkg.pupt.promptDirs;
      }
    } catch {
      // No package.json or no pupt field
    }

    // 3. Fall back to checking for prompts/ directory
    const promptsDir = path.join(packagePath, 'prompts');
    if (await fs2.pathExists(promptsDir)) {
      return ['prompts'];
    }

    return [];
  }
}
