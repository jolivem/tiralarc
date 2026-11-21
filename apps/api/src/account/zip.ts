import { crc32 } from 'node:zlib';

/** One file of the archive: its path inside it ("photos/a.webp") and its bytes. */
export interface ZipEntry {
  name: string;
  data: Uint8Array;
  /** Shown as its modification time (UTC). */
  date: Date;
}

/** File names in UTF-8 (general purpose flag, bit 11). */
const UTF8 = 0x0800;
const VERSION = 20;

/** MS-DOS time and date (2-second precision, years from 1980). */
function dosDateTime(date: Date): { time: number; day: number } {
  const year = Math.max(date.getUTCFullYear(), 1980);
  return {
    time: (date.getUTCHours() << 11) | (date.getUTCMinutes() << 5) | (date.getUTCSeconds() >> 1),
    day: ((year - 1980) << 9) | ((date.getUTCMonth() + 1) << 5) | date.getUTCDate(),
  };
}

/**
 * A ZIP archive written as it goes, its files stored as they are (no compression: photos are
 * compressed already, and the JSON is small): one entry in memory at a time, so an archive of
 * many photos never sits in memory whole. Pure apart from the CRC (node:zlib); unit-tested.
 * Not ZIP64: up to 65 535 files and 4 GB, far beyond an archer's data.
 */
export async function* zipStream(entries: AsyncIterable<ZipEntry>): AsyncGenerator<Buffer> {
  const central: Buffer[] = [];
  let offset = 0;
  let count = 0;
  for await (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    const crc = crc32(entry.data);
    const size = entry.data.length;
    const { time, day } = dosDateTime(entry.date);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(VERSION, 4);
    local.writeUInt16LE(UTF8, 6);
    local.writeUInt16LE(0, 8); // stored
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(day, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(size, 18);
    local.writeUInt32LE(size, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    yield Buffer.concat([local, name]);
    yield Buffer.from(entry.data.buffer, entry.data.byteOffset, entry.data.byteLength);

    const header = Buffer.alloc(46);
    header.writeUInt32LE(0x02014b50, 0);
    header.writeUInt16LE(VERSION, 4);
    header.writeUInt16LE(VERSION, 6);
    header.writeUInt16LE(UTF8, 8);
    header.writeUInt16LE(0, 10);
    header.writeUInt16LE(time, 12);
    header.writeUInt16LE(day, 14);
    header.writeUInt32LE(crc, 16);
    header.writeUInt32LE(size, 20);
    header.writeUInt32LE(size, 24);
    header.writeUInt16LE(name.length, 28);
    // Extra field, comment, disk, internal and external attributes: none.
    header.writeUInt32LE(offset, 42);
    central.push(header, name);

    offset += local.length + name.length + size;
    count += 1;
  }
  const directory = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(count, 8);
  end.writeUInt16LE(count, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  yield Buffer.concat([directory, end]);
}
