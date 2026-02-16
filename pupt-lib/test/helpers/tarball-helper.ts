/**
 * Creates a minimal gzipped tarball in memory for testing.
 * Generates a tar archive with prompt files under package/prompts/,
 * then compresses with gzip.
 */
export async function createTestTarball(
  promptFiles: Array<{ filename: string; content: string }>,
): Promise<ArrayBuffer> {
  const entries: Uint8Array[] = [];

  for (const file of promptFiles) {
    const filePath = `package/prompts/${file.filename}`;
    const contentBytes = new TextEncoder().encode(file.content);

    // Create tar header (512 bytes)
    const header = createTarHeader(filePath, contentBytes.length);
    entries.push(header);

    // Write file content padded to 512-byte boundary
    const paddedSize = Math.ceil(contentBytes.length / 512) * 512;
    const paddedContent = new Uint8Array(paddedSize);
    paddedContent.set(contentBytes);
    entries.push(paddedContent);
  }

  // End-of-archive: two zero-filled 512-byte blocks
  entries.push(new Uint8Array(1024));

  // Concatenate all entries into a single tar buffer
  const totalLength = entries.reduce((sum, e) => sum + e.length, 0);
  const tarBuffer = new Uint8Array(totalLength);
  let offset = 0;
  for (const entry of entries) {
    tarBuffer.set(entry, offset);
    offset += entry.length;
  }

  // Gzip compress using CompressionStream
  const stream = new CompressionStream('gzip');
  const writer = stream.writable.getWriter();
  writer.write(tarBuffer);
  writer.close();

  const reader = stream.readable.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) {break;}
    chunks.push(value);
  }

  const compressedLength = chunks.reduce((sum, c) => sum + c.length, 0);
  const compressed = new Uint8Array(compressedLength);
  let compressedOffset = 0;
  for (const chunk of chunks) {
    compressed.set(chunk, compressedOffset);
    compressedOffset += chunk.length;
  }

  return compressed.buffer;
}

/**
 * Create a tar header block for a regular file.
 */
function createTarHeader(filename: string, size: number): Uint8Array {
  const header = new Uint8Array(512);
  const encoder = new TextEncoder();

  // File name (bytes 0-99)
  const nameBytes = encoder.encode(filename);
  header.set(nameBytes.slice(0, 100), 0);

  // File mode (bytes 100-107): "0000644\0"
  header.set(encoder.encode('0000644\0'), 100);

  // Owner UID (bytes 108-115): "0000000\0"
  header.set(encoder.encode('0000000\0'), 108);

  // Group GID (bytes 116-123): "0000000\0"
  header.set(encoder.encode('0000000\0'), 116);

  // File size in octal (bytes 124-135)
  const sizeOctal = `${size.toString(8).padStart(11, '0')  }\0`;
  header.set(encoder.encode(sizeOctal), 124);

  // Modification time (bytes 136-147): use 0
  header.set(encoder.encode('00000000000\0'), 136);

  // Type flag (byte 156): '0' = regular file
  header[156] = 0x30;

  // Compute checksum: sum of all bytes in header (with checksum field treated as spaces)
  // First, set checksum field (bytes 148-155) to spaces
  header.set(encoder.encode('        '), 148);

  let checksum = 0;
  for (let i = 0; i < 512; i++) {
    checksum += header[i];
  }

  // Write checksum as 6-digit octal, null, space
  const checksumStr = `${checksum.toString(8).padStart(6, '0')  }\0 `;
  header.set(encoder.encode(checksumStr), 148);

  return header;
}
