import type { RandomSource } from "./_generators.ts";

export function mathRandomSource(len: number): Uint8Array {
  const buffer = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    buffer[i] = Math.floor(Math.random() * 0x100);
  }
  return buffer;
}

export function webCryptoRandomSource(
  len: number,
  webCryptoObject?: Crypto,
): Uint8Array {
  const buffer = new Uint8Array(len);
  const target = webCryptoObject ?? crypto;
  target.getRandomValues(buffer);
  return buffer;
}

export function batchedRandomSource(
  source: RandomSource,
  batchSize: number,
): RandomSource {
  let buffer: Uint8Array | undefined;
  let offset = 0;

  return (len: number) => {
    if (!buffer) buffer = source(batchSize);

    const result = new Uint8Array(len);
    let pos = 0;
    while (pos < len) {
      const size = Math.min(len - pos, batchSize - offset);
      result.set(buffer.subarray(offset, offset + size), pos);
      pos += size;
      offset += size;
      if (offset === batchSize) {
        buffer = source(batchSize);
        offset = 0;
      }
    }
    return result;
  };
}
