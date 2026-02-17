import { isComponentClass } from "../component";
import { createPromptFromSource } from "../create-prompt";
import type { ComponentType, ModuleEntry, PuptElement, ResolvedModuleEntry } from "../types";
import { isPuptElement } from "../types/element";
import { isResolvedModuleEntry } from "../types/module";
import { type DiscoveredPromptFile, isPromptSource, type PromptSource } from "../types/prompt-source";
import { PROPS } from "../types/symbols";

// Check if we're in Node.js environment
const isNode = typeof process !== "undefined" && process.versions?.node;

// Dynamically import Node.js modules only in Node environment
async function resolveLocalPath(source: string): Promise<string> {
    if (!isNode) {
        // In browser, just return the source as-is
        return source;
    }

    // In Node.js, resolve relative paths from CWD
    const path = await import("path");
    const url = await import("url");
    const absolutePath = path.resolve(process.cwd(), source);
    return url.pathToFileURL(absolutePath).href;
}

/** A compiled prompt from a discovered .prompt file */
export interface CompiledPrompt {
    element: PuptElement;
    id: string;
    name: string;
    description: string;
    tags: string[];
    version?: string;
}

/**
 * Represents a loaded library with its components and prompts
 */
export interface LoadedLibrary {
    name: string;
    components: Record<string, ComponentType>;
    prompts: Record<string, CompiledPrompt>;
    dependencies: string[];
}

/**
 * Parsed package source information
 */
export interface ParsedPackageSource {
    name: string;
    version?: string;
}

/**
 * ModuleLoader handles loading modules from various sources (npm, URL, GitHub, local).
 * It manages deduplication and version conflict detection.
 */
export class ModuleLoader {
    private loaded = new Map<string, LoadedLibrary>();
    private loading = new Map<string, Promise<LoadedLibrary>>();
    private versions = new Map<string, string>();

    /**
     * Parse a package source string into name and version.
     * Handles scoped packages (@scope/name@version) and regular packages (name@version).
     */
    parsePackageSource(source: string): ParsedPackageSource {
        // Handle scoped packages: @scope/package@version
        if (source.startsWith("@")) {
            const atIndex = source.indexOf("@", 1);
            if (atIndex !== -1) {
                return {
                    name: source.slice(0, atIndex),
                    version: source.slice(atIndex + 1),
                };
            }
            return { name: source };
        }

        // Handle regular packages: package@version
        const atIndex = source.indexOf("@");
        if (atIndex !== -1) {
            return {
                name: source.slice(0, atIndex),
                version: source.slice(atIndex + 1),
            };
        }

        return { name: source };
    }

    /**
     * Load a module entry (ResolvedModuleEntry, PromptSource, or package reference).
     * Dispatches to the appropriate loading strategy based on entry type.
     */
    async loadEntry(entry: ModuleEntry): Promise<LoadedLibrary> {
        if (isPromptSource(entry)) {
            return this.loadPromptSource(entry);
        }

        if (isResolvedModuleEntry(entry)) {
            return this.loadResolvedEntry(entry);
        }

        // Package reference: { source, config }
        if (typeof entry === "object" && entry !== null && "source" in entry && "config" in entry) {
            return this.loadPackageReference(entry as { source: string; config: Record<string, unknown> });
        }

        throw new Error(
            "Invalid module entry: must be a ResolvedModuleEntry, PromptSource, or { source, config } object",
        );
    }

    /**
     * Load a module from a ResolvedModuleEntry.
     * Uses the explicit `type` field for routing and passes `promptDirs` through
     * to the appropriate prompt source.
     */
    async loadResolvedEntry(entry: ResolvedModuleEntry): Promise<LoadedLibrary> {
        const { name, type, source, promptDirs, version, branch } = entry;

        // Check dedup cache using the normalized source
        const normalizedSource = this.normalizeSource(source, type);
        const cachedLoaded = this.loaded.get(normalizedSource);
        if (cachedLoaded) {
            return cachedLoaded;
        }
        const cachedLoading = this.loading.get(normalizedSource);
        if (cachedLoading) {
            return cachedLoading;
        }

        // Version conflict check
        if (version) {
            const existingVersion = this.versions.get(name);
            if (existingVersion && existingVersion !== version) {
                throw new Error(
                    `Version conflict for ${name}: trying to load ${version} but ${existingVersion} is already loaded`,
                );
            }
        }

        const promise = this.doLoad(type, source, promptDirs, branch);
        this.loading.set(normalizedSource, promise);

        try {
            const library = await promise;
            // Override the auto-detected name with the explicit name
            library.name = name;
            this.loaded.set(normalizedSource, library);

            if (version) {
                this.versions.set(name, version);
            }

            return library;
        } finally {
            this.loading.delete(normalizedSource);
        }
    }

    /**
     * Load prompts from a PromptSource instance.
     */
    async loadPromptSource(source: PromptSource, name?: string): Promise<LoadedLibrary> {
        const prompts = await this.discoverAndCompilePrompts(source);

        return {
            name: name ?? source.constructor?.name ?? "PromptSource",
            components: {},
            prompts,
            dependencies: [],
        };
    }

    /**
     * Load prompts from a dynamic package reference.
     * Imports the source module, instantiates its default export with the config,
     * and calls getPrompts() on it.
     */
    async loadPackageReference(ref: { source: string; config: Record<string, unknown> }): Promise<LoadedLibrary> {
        let resolvedSource = ref.source;

        // Resolve relative paths from CWD
        if (isNode && (ref.source.startsWith("./") || ref.source.startsWith("/") || ref.source.startsWith("../"))) {
            const path = await import("path");
            const url = await import("url");
            const absolutePath = path.resolve(process.cwd(), ref.source);
            resolvedSource = url.pathToFileURL(absolutePath).href;
        }

        const module = await import(/* @vite-ignore */ resolvedSource);
        const SourceClass = module.default;

        if (typeof SourceClass !== "function") {
            throw new Error(
                `Package reference source "${ref.source}" must have a default export that is a class or constructor function`,
            );
        }

        const sourceInstance: PromptSource = new SourceClass(ref.config);
        const prompts = await this.discoverAndCompilePrompts(sourceInstance);

        return {
            name: ref.source,
            components: {},
            prompts,
            dependencies: [],
        };
    }

    /**
     * Detect Component classes in module exports
     */
    detectComponents(exports: Record<string, unknown>): Record<string, ComponentType> {
        const components: Record<string, ComponentType> = {};

        for (const [name, value] of Object.entries(exports)) {
            if (isComponentClass(value)) {
                // Cast through unknown because isComponentClass returns typeof Component (abstract)
                // but ComponentType expects a concrete constructor
                components[name] = value as unknown as ComponentType;
            }
        }

        return components;
    }

    /**
     * Detect Prompt elements in module exports
     */
    detectPrompts(exports: Record<string, unknown>): Record<string, PuptElement> {
        const prompts: Record<string, PuptElement> = {};

        for (const [name, value] of Object.entries(exports)) {
            if (this.isPromptElement(value)) {
                prompts[name] = value as PuptElement;
            }
        }

        return prompts;
    }

    /**
     * Normalize a source string for consistent deduplication.
     * Resolves relative paths to absolute, normalizes package names to lowercase.
     */
    normalizeSource(source: string, type: ResolvedModuleEntry["type"]): string {
        if (type === "local" && isNode) {
            try {
                if (source.startsWith("./") || source.startsWith("../")) {
                    const cwd = process.cwd();
                    return `${cwd}/${source}`.replace(/\/\.\//g, "/");
                }
            } catch {
                // Fallback to raw source
            }
        }

        if (type === "npm") {
            const parsed = this.parsePackageSource(source);
            const normalizedName = parsed.name.toLowerCase();
            return parsed.version ? `${normalizedName}@${parsed.version}` : normalizedName;
        }

        return source;
    }

    /**
     * Discover and compile .prompt files from a PromptSource.
     * Each file is compiled through createPromptFromSource() and metadata extracted.
     */
    async discoverAndCompilePrompts(source: PromptSource): Promise<Record<string, CompiledPrompt>> {
        const files = await source.getPrompts();
        return this.compilePromptFiles(files);
    }

    /**
     * Clear all loaded modules (useful for testing)
     */
    clear(): void {
        this.loaded.clear();
        this.loading.clear();
        this.versions.clear();
    }

    /**
     * Convert detected PuptElement prompts from JS exports into CompiledPrompt records.
     */
    private convertDetectedPrompts(detectedPrompts: Record<string, PuptElement>): Record<string, CompiledPrompt> {
        const prompts: Record<string, CompiledPrompt> = {};
        for (const [exportName, element] of Object.entries(detectedPrompts)) {
            const props = element[PROPS] as {
                name?: string;
                description?: string;
                tags?: string[];
                version?: string;
            } | null;
            const name = props?.name ?? exportName;
            prompts[name] = {
                element,
                id: crypto.randomUUID(),
                name,
                description: props?.description ?? "",
                tags: props?.tags ?? [],
                version: props?.version,
            };
        }
        return prompts;
    }

    /**
     * Check if a value is a PuptElement with a name prop (indicates a Prompt)
     */
    private isPromptElement(value: unknown): boolean {
        if (!isPuptElement(value)) {
            return false;
        }
        const props = value[PROPS];
        return props !== null && typeof props === "object" && "name" in props;
    }

    /**
     * Compile an array of discovered prompt files into CompiledPrompt records.
     */
    private async compilePromptFiles(files: DiscoveredPromptFile[]): Promise<Record<string, CompiledPrompt>> {
        const prompts: Record<string, CompiledPrompt> = {};

        for (const file of files) {
            const element = await createPromptFromSource(file.content, file.filename);
            const props = element[PROPS] as {
                name?: string;
                description?: string;
                tags?: string[];
                version?: string;
            } | null;
            const name = props?.name ?? file.filename.replace(/\.prompt$/, "");
            prompts[name] = {
                element,
                id: crypto.randomUUID(),
                name,
                description: props?.description ?? "",
                tags: props?.tags ?? [],
                version: props?.version,
            };
        }

        return prompts;
    }

    /**
     * Internal load dispatch using explicit type and passing promptDirs to prompt sources.
     */
    private async doLoad(
        type: ResolvedModuleEntry["type"],
        source: string,
        promptDirs?: string[],
        branch?: string,
    ): Promise<LoadedLibrary> {
        switch (type) {
            case "local":
                return this.loadLocal(source, promptDirs);
            case "npm":
                return this.loadNpm(source, promptDirs);
            case "url":
                return this.loadUrl(source);
            case "git":
                return this.loadGit(source, promptDirs, branch);
            default:
                throw new Error(`Unsupported module type: ${type as string}`);
        }
    }

    /**
     * Load a local module
     */
    private async loadLocal(source: string, promptDirs?: string[]): Promise<LoadedLibrary> {
        let components: Record<string, ComponentType> = {};
        let dependencies: string[] = [];
        let prompts: Record<string, CompiledPrompt> = {};

        // Try to import as a JS module
        try {
            const resolvedPath = await resolveLocalPath(source);
            const module = await import(/* @vite-ignore */ resolvedPath);
            components = this.detectComponents(module);
            dependencies = module.dependencies ?? [];
            // Also detect prompt elements from JS exports
            const jsPrompts = this.detectPrompts(module);
            prompts = this.convertDetectedPrompts(jsPrompts);
        } catch {
            // No JS module found — that's fine, we may still have .prompt files
        }

        // Try to discover .prompt files (.prompt files take precedence over JS exports)
        if (isNode) {
            try {
                const { LocalPromptSource } = await import("./prompt-sources/local-prompt-source");
                const promptSource = new LocalPromptSource(source, { promptDirs });
                const filePrompts = await this.discoverAndCompilePrompts(promptSource);
                prompts = { ...prompts, ...filePrompts };
            } catch {
                // No .prompt files found — that's fine
            }
        }

        // If we found neither components nor prompts, throw
        if (Object.keys(components).length === 0 && Object.keys(prompts).length === 0) {
            throw new Error(`Failed to load local module "${source}": no JS module or .prompt files found`);
        }

        return {
            name: this.extractNameFromPath(source),
            components,
            prompts,
            dependencies,
        };
    }

    /**
     * Load an npm package.
     * Tries to import as a JS module and additionally discovers .prompt files.
     */
    private async loadNpm(source: string, promptDirs?: string[]): Promise<LoadedLibrary> {
        const parsed = this.parsePackageSource(source);
        let components: Record<string, ComponentType> = {};
        let dependencies: string[] = [];
        let prompts: Record<string, CompiledPrompt> = {};
        let jsLoaded = false;

        // Try to import as a JS module
        try {
            const module = await import(parsed.name);
            components = this.detectComponents(module);
            dependencies = module.dependencies ?? [];
            jsLoaded = true;
            // Also detect prompt elements from JS exports
            const jsPrompts = this.detectPrompts(module);
            prompts = this.convertDetectedPrompts(jsPrompts);
        } catch {
            // JS module not found — may still have .prompt files
        }

        // Try to discover .prompt files from the npm package (.prompt files take precedence)
        if (isNode) {
            try {
                const { NpmLocalPromptSource } = await import("./prompt-sources/npm-local-prompt-source");
                const promptSource = new NpmLocalPromptSource(parsed.name, { promptDirs });
                const filePrompts = await this.discoverAndCompilePrompts(promptSource);
                prompts = { ...prompts, ...filePrompts };
            } catch {
                // No .prompt files found — that's fine
            }
        }

        // If we couldn't import the JS module and found no prompts, throw
        if (!jsLoaded && Object.keys(prompts).length === 0) {
            throw new Error(`Failed to load npm package "${source}": no JS module or .prompt files found`);
        }

        return {
            name: parsed.name,
            components,
            prompts,
            dependencies,
        };
    }

    /**
     * Check if a URL looks like an npm tarball or CDN package URL.
     */
    private isTarballOrCdnUrl(url: string): boolean {
        // Direct tarball URLs end in .tgz
        if (url.endsWith(".tgz")) {
            return true;
        }

        // Known CDN patterns for npm packages
        try {
            const parsed = new URL(url);
            const host = parsed.hostname;
            return (
                host === "cdn.jsdelivr.net" ||
                host === "unpkg.com" ||
                host === "esm.sh" ||
                host === "registry.npmjs.org"
            );
        } catch {
            return false;
        }
    }

    /**
     * Load a module from a URL.
     * Routes tarball/CDN URLs to NpmRegistryPromptSource for prompt discovery.
     * Other URLs are loaded as JS modules via dynamic import.
     */
    private async loadUrl(source: string): Promise<LoadedLibrary> {
        // Check if this is a tarball or CDN package URL
        if (this.isTarballOrCdnUrl(source)) {
            return this.loadUrlAsPromptSource(source);
        }

        // Standard JS module import via URL
        try {
            const module = await import(/* webpackIgnore: true */ source);

            return {
                name: this.extractNameFromUrl(source),
                components: this.detectComponents(module),
                prompts: {},
                dependencies: module.dependencies ?? [],
            };
        } catch (error) {
            throw new Error(
                `Failed to load module from URL "${source}": ${error instanceof Error ? error.message : String(error)}`,
            );
        }
    }

    /**
     * Load prompts from a tarball or CDN URL via NpmRegistryPromptSource.
     */
    private async loadUrlAsPromptSource(source: string): Promise<LoadedLibrary> {
        const { NpmRegistryPromptSource } = await import("./prompt-sources/npm-registry-prompt-source");
        const promptSource = NpmRegistryPromptSource.fromUrl(source);
        const prompts = await this.discoverAndCompilePrompts(promptSource);

        return {
            name: this.extractNameFromUrl(source),
            components: {},
            prompts,
            dependencies: [],
        };
    }

    /**
     * Load a module from a Git source (GitHub URL).
     * Extracts owner/repo from the URL, tries JS import and .prompt file discovery.
     */
    private async loadGit(source: string, promptDirs?: string[], branch?: string): Promise<LoadedLibrary> {
        // Extract owner/repo from various git URL formats
        const match = source.match(/github\.com[/:]([^/]+)\/([^/.#]+)/);
        if (!match) {
            throw new Error(`Cannot extract GitHub owner/repo from source: ${source}`);
        }

        const [, owner, repo] = match;

        // Branch priority: explicit branch param > URL fragment > default 'master'
        const hashIndex = source.indexOf("#");
        const fragmentRef = hashIndex !== -1 ? source.slice(hashIndex + 1) : undefined;
        const ref = branch ?? fragmentRef;

        let components: Record<string, ComponentType> = {};
        let dependencies: string[] = [];
        let prompts: Record<string, CompiledPrompt> = {};

        // Try to import as a JS module from GitHub
        try {
            const url = `https://raw.githubusercontent.com/${owner}/${repo}/${ref ?? "master"}/index.js`;
            const library = await this.loadUrl(url);
            ({ components } = library);
            ({ dependencies } = library);
        } catch {
            // No JS module found — that's fine
        }

        // Discover .prompt files via GitHubPromptSource
        try {
            const { GitHubPromptSource } = await import("./prompt-sources/github-prompt-source");
            const ownerRepo = `${owner}/${repo}`;
            const options = { ref, promptDirs };
            const promptSource = new GitHubPromptSource(ownerRepo, options);
            prompts = await this.discoverAndCompilePrompts(promptSource);
        } catch {
            // No .prompt files found — that's fine
        }

        if (Object.keys(components).length === 0 && Object.keys(prompts).length === 0) {
            throw new Error(`Failed to load GitHub module "${source}": no JS module or .prompt files found`);
        }

        return {
            name: `${owner}/${repo}`,
            components,
            prompts,
            dependencies,
        };
    }

    /**
     * Extract a module name from a file path
     */
    private extractNameFromPath(path: string): string {
        const parts = path.split("/");
        return parts[parts.length - 1] || "unknown";
    }

    /**
     * Extract a module name from a URL
     */
    private extractNameFromUrl(url: string): string {
        try {
            const urlObj = new URL(url);
            const { pathname } = urlObj;
            const parts = pathname.split("/").filter(Boolean);
            return parts[parts.length - 1]?.replace(/\.js$/, "") || "unknown";
        } catch {
            return "unknown";
        }
    }
}
