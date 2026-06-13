const UTF8_DECODER = new TextDecoder('utf-8', { fatal: true });
const UTF8_ENCODER = new TextEncoder();

class ByteReader {
  private offset = 0;

  constructor(private readonly data: Uint8Array) {}

  readByte(): number {
    this.require(1);
    return this.data[this.offset++]!;
  }

  readUint16(): number {
    this.require(2);
    const value = (this.data[this.offset]! << 8) | this.data[this.offset + 1]!;
    this.offset += 2;
    return value;
  }

  readInt32(): number {
    this.require(4);
    const value = new DataView(
      this.data.buffer,
      this.data.byteOffset + this.offset,
      4,
    ).getInt32(0, false);
    this.offset += 4;
    return value;
  }

  readBytes(length: number): Uint8Array {
    if (!Number.isSafeInteger(length) || length < 0) {
      throw new Error(`Invalid NBT byte length: ${length}`);
    }
    this.require(length);
    const value = this.data.subarray(this.offset, this.offset + length);
    this.offset += length;
    return value;
  }

  get remaining(): number {
    return this.data.length - this.offset;
  }

  private require(length: number): void {
    if (this.offset + length > this.data.length) {
      throw new Error('Unexpected end of NBT data');
    }
  }
}

class ByteWriter {
  private data = new Uint8Array(1024);
  private offset = 0;

  writeByte(value: number): void {
    this.ensure(1);
    this.data[this.offset++] = value;
  }

  writeUint16(value: number): void {
    if (!Number.isSafeInteger(value) || value < 0 || value > 0xffff) {
      throw new Error(`NBT string exceeds the unsigned-short byte limit: ${value}`);
    }
    this.ensure(2);
    this.data[this.offset++] = value >>> 8;
    this.data[this.offset++] = value & 0xff;
  }

  writeInt32(value: number): void {
    this.ensure(4);
    new DataView(this.data.buffer).setInt32(this.offset, value, false);
    this.offset += 4;
  }

  writeBytes(value: Uint8Array): void {
    this.ensure(value.length);
    this.data.set(value, this.offset);
    this.offset += value.length;
  }

  finish(): Uint8Array {
    return this.data.slice(0, this.offset);
  }

  private ensure(length: number): void {
    const required = this.offset + length;
    if (required <= this.data.length) return;
    let capacity = this.data.length;
    while (capacity < required) capacity *= 2;
    const next = new Uint8Array(capacity);
    next.set(this.data);
    this.data = next;
  }
}

function decodeModifiedUtf8(bytes: Uint8Array): string {
  const codeUnits: number[] = [];

  for (let index = 0; index < bytes.length;) {
    const first = bytes[index++]!;
    if (first > 0 && first <= 0x7f) {
      codeUnits.push(first);
      continue;
    }

    if ((first & 0xe0) === 0xc0) {
      if (index >= bytes.length) throw new Error('Truncated Modified UTF-8 sequence');
      const second = bytes[index++]!;
      if ((second & 0xc0) !== 0x80) throw new Error('Invalid Modified UTF-8 sequence');
      const value = ((first & 0x1f) << 6) | (second & 0x3f);
      if (value !== 0 && value < 0x80) throw new Error('Overlong Modified UTF-8 sequence');
      codeUnits.push(value);
      continue;
    }

    if ((first & 0xf0) === 0xe0) {
      if (index + 1 >= bytes.length) throw new Error('Truncated Modified UTF-8 sequence');
      const second = bytes[index++]!;
      const third = bytes[index++]!;
      if ((second & 0xc0) !== 0x80 || (third & 0xc0) !== 0x80) {
        throw new Error('Invalid Modified UTF-8 sequence');
      }
      const value =
        ((first & 0x0f) << 12) |
        ((second & 0x3f) << 6) |
        (third & 0x3f);
      if (value < 0x800) throw new Error('Overlong Modified UTF-8 sequence');
      codeUnits.push(value);
      continue;
    }

    throw new Error('Unsupported byte in Modified UTF-8 sequence');
  }

  const parts: string[] = [];
  for (let index = 0; index < codeUnits.length; index += 8192) {
    parts.push(String.fromCharCode(...codeUnits.slice(index, index + 8192)));
  }
  return parts.join('');
}

function assertWellFormedUtf16(value: string): void {
  for (let index = 0; index < value.length; index++) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) {
        throw new Error('NBT string contains an unpaired high surrogate');
      }
      index++;
    } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      throw new Error('NBT string contains an unpaired low surrogate');
    }
  }
}

export function assertNbtStringsWellFormed(value: unknown): void {
  if (typeof value === 'string') {
    assertWellFormedUtf16(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) assertNbtStringsWellFormed(item);
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    assertWellFormedUtf16(key);
    assertNbtStringsWellFormed(child);
  }
}

function encodeModifiedUtf8(value: string): Uint8Array {
  const bytes: number[] = [];

  for (let index = 0; index < value.length; index++) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit === 0) {
      bytes.push(0xc0, 0x80);
    } else if (codeUnit <= 0x7f) {
      bytes.push(codeUnit);
    } else if (codeUnit <= 0x7ff) {
      bytes.push(
        0xc0 | (codeUnit >>> 6),
        0x80 | (codeUnit & 0x3f),
      );
    } else {
      bytes.push(
        0xe0 | (codeUnit >>> 12),
        0x80 | ((codeUnit >>> 6) & 0x3f),
        0x80 | (codeUnit & 0x3f),
      );
    }
  }

  return Uint8Array.from(bytes);
}

type StringEncoding = 'modified' | 'standard';

function transcodeString(
  reader: ByteReader,
  writer: ByteWriter,
  sourceEncoding: StringEncoding,
): void {
  const source = reader.readBytes(reader.readUint16());
  const value = sourceEncoding === 'modified'
    ? decodeModifiedUtf8(source)
    : UTF8_DECODER.decode(source);
  assertWellFormedUtf16(value);
  const encoded = sourceEncoding === 'modified'
    ? UTF8_ENCODER.encode(value)
    : encodeModifiedUtf8(value);
  writer.writeUint16(encoded.length);
  writer.writeBytes(encoded);
}

function copyBytes(reader: ByteReader, writer: ByteWriter, length: number): void {
  writer.writeBytes(reader.readBytes(length));
}

function copyPayload(
  type: number,
  reader: ByteReader,
  writer: ByteWriter,
  sourceEncoding: StringEncoding,
): void {
  switch (type) {
    case 0:
      return;
    case 1:
      copyBytes(reader, writer, 1);
      return;
    case 2:
      copyBytes(reader, writer, 2);
      return;
    case 3:
    case 5:
      copyBytes(reader, writer, 4);
      return;
    case 4:
    case 6:
      copyBytes(reader, writer, 8);
      return;
    case 7: {
      const length = reader.readInt32();
      writer.writeInt32(length);
      copyBytes(reader, writer, length);
      return;
    }
    case 8:
      transcodeString(reader, writer, sourceEncoding);
      return;
    case 9: {
      const childType = reader.readByte();
      const length = reader.readInt32();
      if (length < 0) throw new Error(`Invalid NBT list length: ${length}`);
      writer.writeByte(childType);
      writer.writeInt32(length);
      for (let index = 0; index < length; index++) {
        copyPayload(childType, reader, writer, sourceEncoding);
      }
      return;
    }
    case 10:
      while (true) {
        const childType = reader.readByte();
        writer.writeByte(childType);
        if (childType === 0) return;
        transcodeString(reader, writer, sourceEncoding);
        copyPayload(childType, reader, writer, sourceEncoding);
      }
    case 11:
    case 12: {
      const length = reader.readInt32();
      if (length < 0) throw new Error(`Invalid NBT array length: ${length}`);
      writer.writeInt32(length);
      copyBytes(reader, writer, length * (type === 11 ? 4 : 8));
      return;
    }
    default:
      throw new Error(`Unknown NBT tag type: ${type}`);
  }
}

function transcodeNbtStrings(
  data: Uint8Array,
  sourceEncoding: StringEncoding,
): Uint8Array {
  const reader = new ByteReader(data);
  const writer = new ByteWriter();

  while (reader.remaining > 0) {
    const rootType = reader.readByte();
    writer.writeByte(rootType);
    if (rootType === 0) continue;
    transcodeString(reader, writer, sourceEncoding);
    copyPayload(rootType, reader, writer, sourceEncoding);
  }

  return writer.finish();
}

export function modifiedUtf8NbtToStandard(data: Uint8Array): Uint8Array {
  return transcodeNbtStrings(data, 'modified');
}

export function standardUtf8NbtToModified(data: Uint8Array): Uint8Array {
  return transcodeNbtStrings(data, 'standard');
}
