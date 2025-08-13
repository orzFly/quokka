import { format } from "./_format.ts";
import { lowercaseAlphabetNumber } from "./_patterns.ts";

export type RandomSource = (len: number) => Uint8Array;

export function bytes(source: RandomSource, len: number): Uint8Array {
  return source(len);
}

export const maxUint64 = 18_446_744_073_709_551_615n;
export function uint64(source: RandomSource): bigint {
  const dataView = new DataView(source(8).buffer);
  return dataView.getBigUint64(0);
}

export const maxUInt32 = 4_294_967_296;
export function uint32(source: RandomSource): number {
  const dataView = new DataView(source(4).buffer);
  return dataView.getUint32(0);
}

export const maxUint16 = 65_536;
export function uint16(source: RandomSource): number {
  const dataView = new DataView(source(2).buffer);
  return dataView.getUint16(0);
}

export const maxUint8 = 256;
export function uint8(source: RandomSource): number {
  const dataView = new DataView(source(1).buffer);
  return dataView.getUint8(0);
}

const maxIntegerIter = 100;
function rejectionSampling(source: RandomSource, range: number): number {
  let sample: number;
  let i = 0;
  do {
    sample = uint32(source);
    if (i >= maxIntegerIter) {
      break; /* just returns biased sample using remainder */
    }
    i++;
  } while (!(sample < Math.floor(maxUInt32 / range) * range));

  const unsafeCoerced = sample % range;
  return unsafeCoerced;
}

/** [0, range) */
export function integerLessThan(source: RandomSource, range: number): number {
  return rejectionSampling(source, Math.ceil(range));
}

/** [min, max] */
export function integer(
  source: RandomSource,
  min: number = 0,
  max: number = 65536,
): number {
  if (min <= max) {
    const l = Math.ceil(min);
    const h = Math.floor(max);
    return (l + integerLessThan(source, h - l + 1));
  }
  return NaN;
}

export function pattern(
  random: RandomSource,
  len: number,
  patterns: string | readonly string[] = lowercaseAlphabetNumber,
): string {
  if (typeof patterns === "string") {
    return format(random, patterns, len);
  }
  if (len < patterns.length) {
    return format(random, patterns.join(""), len);
  } else {
    let buf = "";
    for (const subpattern of patterns) {
      buf += format(random, subpattern, 1);
    }
    buf += format(random, patterns.join(""), len - patterns.length);

    const chars = buf.split("");
    const positions = Array.from({ length: chars.length }, (_, i) => i);
    const randoms = positions.map(() => uint32(random));
    const sortedPositions = positions.sort((a, b) => randoms[a]! - randoms[b]!);
    const sortedChars = sortedPositions.map((i) => chars[i]!);
    return sortedChars.join("");
  }
}

export function uniquePatterns(
  random: RandomSource,
  count: number,
  len: number,
  patterns: string | readonly string[] = lowercaseAlphabetNumber,
  existingPatterns?: string[],
): string[] {
  const map = new Set<string>();
  if (existingPatterns) {
    const existingMap = new Set<string>();
    for (const p of existingPatterns) {
      existingMap.add(p);
    }

    while (map.size < count) {
      const p = pattern(random, len, patterns);
      if (existingMap.has(p)) continue;
      map.add(pattern(random, len, patterns));
    }
  } else {
    while (map.size < count) {
      map.add(pattern(random, len, patterns));
    }
  }
  return [...map.keys()];
}
