import type { DiscoveredPromptFile } from '../../types/prompt-source';

/**
 * Decompress a gzipped ArrayBuffer using the native DecompressionStream API.
 * Available in Node.js 18+ and all modern browsers.
 */
export async function decompressGzip(compressed: ArrayBuffer): Promise<ArrayBuffer> {
  const stream = new DecompressionStream('gzip');
  const writer = stream.writable.getWriter();
  void writer.write(new Uint8Array(compressed));
  void writer.close();

  const reader = stream.readable.getReader();
  const chunks: Uint8Array[] = [];
  let totalLength = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {break;}
    const chunk = value as Uint8Array;
    chunks.push(chunk);
    totalLength += chunk.length;
  }

  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result.buffer;
}

/**
 * Minimal tar parser for read-only extraction of file entries.
 *
 * The tar format uses 512-byte header blocks followed by file data
 * aligned to 512-byte boundaries. We only need to iterate entries
 * and extract their content.
 */
export interface TarEntry {
  name: string;
  size: number;
  content: Uint8Array;
}

/**
 * Parse a tar archive (uncompressed) and yield file entries.
 */
export function parseTar(buffer: ArrayBuffer): TarEntry[] {
  const data = new Uint8Array(buffer);
  const entries: TarEntry[] = [];
  let offset = 0;

  while (offset + 512 <= data.length) {
    const header = data.slice(offset, offset + 512);

    // Check for end-of-archive (two consecutive zero-filled blocks)
    if (header.every(b => b === 0)) {
      break;
    }

    // Extract filename (bytes 0-99, null-terminated)
    const name = readString(header, 0, 100);

    // Extract file size (bytes 124-135, octal ASCII)
    const sizeStr = readString(header, 124, 12);
    const size = parseInt(sizeStr, 8) || 0;

    // Extract type flag (byte 156): '0' or '\0' = regular file, '5' = directory
    const typeFlag = header[156];

    offset += 512; // Move past header

    if ((typeFlag === 0x30 || typeFlag === 0) && size > 0) {
      // Regular file — extract content
      const content = data.slice(offset, offset + size);
      entries.push({ name, size, content });
    }

    // Advance past file data, aligned to 512-byte blocks
    offset += Math.ceil(size / 512) * 512;
  }

  return entries;
}

/**
 * Read a null-terminated ASCII string from a Uint8Array.
 */
function readString(data: Uint8Array, offset: number, maxLength: number): string {
  let end = offset;
  while (end < offset + maxLength && data[end] !== 0) {
    end++;
  }
  return new TextDecoder('ascii').decode(data.slice(offset, end)).trim();
}

/**
 * Extract .prompt files from a gzipped tarball (e.g., from npm registry).
 *
 * Looks for files matching `package/prompts/*.prompt` or `prompts/*.prompt`
 * within the tar archive.
 */
export async function extractPromptFiles(tarballBuffer: ArrayBuffer): Promise<DiscoveredPromptFile[]> {
  const decompressed = await decompressGzip(tarballBuffer);
  const entries = parseTar(decompressed);

  const promptFiles: DiscoveredPromptFile[] = [];

  for (const entry of entries) {
    // npm tarballs prefix files with `package/`
    // Match: package/prompts/*.prompt or prompts/*.prompt
    const normalizedName = entry.name.replace(/^package\//, '');

    if (normalizedName.startsWith('prompts/') && normalizedName.endsWith('.prompt')) {
      const filename = normalizedName.split('/').pop() ?? normalizedName;
      const content = new TextDecoder('utf-8').decode(entry.content);
      promptFiles.push({ filename, content });
    }
  }

  return promptFiles;
}
