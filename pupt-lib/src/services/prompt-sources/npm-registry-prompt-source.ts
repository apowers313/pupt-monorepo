import type { PromptSource, DiscoveredPromptFile } from '../../types/prompt-source';
import { extractPromptFiles } from './tar-utils';

/**
 * Discovers .prompt files from npm packages by fetching tarballs from the registry.
 *
 * Supports:
 * - Package specifiers: "package-name" or "package-name@version"
 * - Direct tarball URLs: "https://registry.npmjs.org/pkg/-/pkg-1.0.0.tgz"
 * - Custom registry URLs for enterprise registries
 */
export class NpmRegistryPromptSource implements PromptSource {
  private packageName?: string;
  private version?: string;
  private tarballUrl?: string;
  private registryUrl: string;

  constructor(specifier: string, options?: { registryUrl?: string }) {
    this.registryUrl = options?.registryUrl ?? 'https://registry.npmjs.org';

    if (specifier.startsWith('https://') || specifier.startsWith('http://')) {
      // Direct tarball URL
      this.tarballUrl = specifier;
    } else {
      // Package specifier: name or name@version
      const { name, version } = this.parseSpecifier(specifier);
      this.packageName = name;
      this.version = version;
    }
  }

  /**
   * Create an NpmRegistryPromptSource from a direct tarball URL.
   */
  static fromUrl(url: string): NpmRegistryPromptSource {
    return new NpmRegistryPromptSource(url);
  }

  async getPrompts(): Promise<DiscoveredPromptFile[]> {
    const tarballUrl = this.tarballUrl ?? await this.resolveTarballUrl();
    const tarballBuffer = await this.downloadTarball(tarballUrl);
    return extractPromptFiles(tarballBuffer);
  }

  /**
   * Parse a package specifier into name and optional version.
   */
  private parseSpecifier(specifier: string): { name: string; version?: string } {
    // Handle scoped packages: @scope/package@version
    if (specifier.startsWith('@')) {
      const atIndex = specifier.indexOf('@', 1);
      if (atIndex !== -1) {
        return {
          name: specifier.slice(0, atIndex),
          version: specifier.slice(atIndex + 1),
        };
      }
      return { name: specifier };
    }

    // Handle regular packages: package@version
    const atIndex = specifier.indexOf('@');
    if (atIndex !== -1) {
      return {
        name: specifier.slice(0, atIndex),
        version: specifier.slice(atIndex + 1),
      };
    }

    return { name: specifier };
  }

  /**
   * Resolve the tarball URL by fetching package metadata from the registry.
   */
  private async resolveTarballUrl(): Promise<string> {
    const version = this.version ?? 'latest';
    const url = `${this.registryUrl}/${this.packageName}/${version}`;

    let response: Response;
    try {
      response = await fetch(url);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Fetch failed for "${this.packageName}@${version}": ${message}`);
    }

    if (!response.ok) {
      throw new Error(
        `Fetch failed for "${this.packageName}@${version}": HTTP ${response.status} ${response.statusText}`,
      );
    }

    const metadata = await response.json() as { dist?: { tarball?: string } };

    if (!metadata.dist?.tarball) {
      throw new Error(
        `No tarball URL found in registry metadata for "${this.packageName}@${version}"`,
      );
    }

    return metadata.dist.tarball;
  }

  /**
   * Download a tarball from the given URL.
   */
  private async downloadTarball(url: string): Promise<ArrayBuffer> {
    let response: Response;
    try {
      response = await fetch(url);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Fetch failed for tarball at "${url}": ${message}`);
    }

    if (!response.ok) {
      throw new Error(
        `Fetch failed for tarball at "${url}": HTTP ${response.status} ${response.statusText}`,
      );
    }

    return response.arrayBuffer();
  }
}
