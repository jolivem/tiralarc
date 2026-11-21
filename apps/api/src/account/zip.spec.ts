import { crc32 } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { type ZipEntry, zipStream } from './zip.js';

async function zip(entries: ZipEntry[]): Promise<Buffer> {
  async function* source() {
    yield* entries;
  }
  const parts: Buffer[] = [];
  for await (const part of zipStream(source())) parts.push(part);
  return Buffer.concat(parts);
}

/** Reads the archive back through its central directory, as unzip tools do. */
function read(archive: Buffer): { name: string; data: Buffer; crc: number }[] {
  const end = archive.length - 22;
  expect(archive.readUInt32LE(end)).toBe(0x06054b50);
  const count = archive.readUInt16LE(end + 10);
  let at = archive.readUInt32LE(end + 16);
  const files = [];
  for (let i = 0; i < count; i++) {
    expect(archive.readUInt32LE(at)).toBe(0x02014b50);
    const nameLength = archive.readUInt16LE(at + 28);
    const name = archive.subarray(at + 46, at + 46 + nameLength).toString('utf8');
    const local = archive.readUInt32LE(at + 42);
    expect(archive.readUInt32LE(local)).toBe(0x04034b50);
    const size = archive.readUInt32LE(local + 22);
    const start = local + 30 + archive.readUInt16LE(local + 26);
    files.push({
      name,
      data: archive.subarray(start, start + size),
      crc: archive.readUInt32LE(at + 16),
    });
    at += 46 + nameLength;
  }
  return files;
}

describe('zipStream', () => {
  const date = new Date('2026-11-21T10:30:00Z');

  it('writes an archive whose files read back with their names, bytes and checksums', async () => {
    const json = Buffer.from('{"journal":"Saison 2026-2027"}');
    const photo = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x10]);
    const files = read(
      await zip([
        { name: 'données.json', data: json, date },
        { name: 'photos/2026-11-08/a.webp', data: photo, date },
      ]),
    );
    expect(files.map((f) => f.name)).toEqual(['données.json', 'photos/2026-11-08/a.webp']);
    expect(files[0]!.data.equals(json)).toBe(true);
    expect(files[1]!.data.equals(photo)).toBe(true);
    expect(files[1]!.crc).toBe(crc32(photo));
  });

  it('writes a valid empty archive', async () => {
    const archive = await zip([]);
    expect(archive.length).toBe(22);
    expect(read(archive)).toEqual([]);
  });
});
