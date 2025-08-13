import * as generators from "./_generators.ts";

export class Determiner {
  constructor(
    public readonly source: generators.RandomSource,
  ) {
  }

  public bytes(len: number): Uint8Array {
    return generators.bytes(this.source, len);
  }

  public readonly maxUint64 = generators.maxUint64;
  public uint64(): bigint {
    return generators.uint64(this.source);
  }

  public readonly maxUInt32 = generators.maxUInt32;
  public uint32(): number {
    return generators.uint32(this.source);
  }

  public readonly maxUint16 = generators.maxUint16;
  public uint16(): number {
    return generators.uint16(this.source);
  }

  public readonly maxUint8 = generators.maxUint8;
  public uint8(): number {
    return generators.uint8(this.source);
  }

  /** [0, range) */
  public integerLessThan(range: number): number {
    return generators.integerLessThan(this.source, range);
  }

  /** [min, max] */
  public integer(min: number = 0, max: number = 65536): number {
    return generators.integer(this.source, min, max);
  }

  public pattern(
    len: number,
    pattern?: string | readonly string[],
  ): string {
    return generators.pattern(this.source, len, pattern);
  }

  public uniquePatterns(
    count: number,
    len: number,
    pattern?: string | readonly string[],
    existingPatterns?: string[],
  ): string[] {
    return generators.uniquePatterns(
      this.source,
      count,
      len,
      pattern,
      existingPatterns,
    );
  }
}
