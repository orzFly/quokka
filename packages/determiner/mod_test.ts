import { assert, assertEquals, assertExists } from "@std/assert";
import { assertSnapshot } from "@std/testing/snapshot";
import { batchedRandomSource } from "./_source.ts";
import {
  bytes,
  Determiner,
  integer,
  pattern,
  uint16,
  uint32,
  uint64,
  uint8,
  uniquePatterns,
} from "./mod.ts";

const stableRandomSource = (len: number) => {
  const buffer = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    buffer[i] = i % 0x100;
  }
  return buffer;
};

const createSource = () => batchedRandomSource(stableRandomSource, 1024);

Deno.test("bytes function", async (t) => {
  const source = createSource();
  const result = bytes(source, 10);
  assertEquals(result.length, 10);
  assertEquals(result[0], 0);
  assertEquals(result[9], 9);
  await assertSnapshot(t, result);
});

Deno.test("uint64 function", async (t) => {
  const source = createSource();
  const result = uint64(source);
  assert(typeof result === "bigint");
  assert(result >= 0n);
  assert(result <= 0xFFFFFFFFFFFFFFFFn);
  await assertSnapshot(t, result);
});

Deno.test("uint32 function", async (t) => {
  const source = createSource();
  const result = uint32(source);
  assert(typeof result === "number");
  assert(result >= 0);
  assert(result <= 0xFFFFFFFF);
  await assertSnapshot(t, result);
});

Deno.test("uint16 function", async (t) => {
  const source = createSource();
  const result = uint16(source);
  assert(typeof result === "number");
  assert(result >= 0);
  assert(result <= 0xFFFF);
  await assertSnapshot(t, result);
});

Deno.test("uint8 function", async (t) => {
  const source = createSource();
  const result = uint8(source);
  assert(typeof result === "number");
  assert(result >= 0);
  assert(result <= 0xFF);
  await assertSnapshot(t, result);
});

Deno.test("integer function - default range", async (t) => {
  const source = createSource();
  const result = integer(source);
  assert(typeof result === "number");
  assert(result >= 0);
  assert(result <= 65536);
  await assertSnapshot(t, result);
});

Deno.test("integer function - custom range", async (t) => {
  const source = createSource();
  const result = integer(source, 5, 15);
  assert(typeof result === "number");
  assert(result >= 5);
  assert(result <= 15);
  await assertSnapshot(t, result);
});

Deno.test("integer function - invalid range", async (t) => {
  const source = createSource();
  const result = integer(source, 15, 5);
  assert(isNaN(result));
  await assertSnapshot(t, result);
});

Deno.test("pattern function - string pattern", async (t) => {
  const source = createSource();
  const result = pattern(source, 5, "abc");
  assertEquals(result.length, 5);
  assert(result.split("").every((char) => "abc".includes(char)));
  await assertSnapshot(t, result);
});

Deno.test("pattern function - array pattern", async (t) => {
  const source = createSource();
  const result = pattern(source, 3, ["abc", "123"]);
  assertEquals(result.length, 3);
  await assertSnapshot(t, result);
});

Deno.test("pattern function - default pattern", async (t) => {
  const source = createSource();
  const result = pattern(source, 8);
  assertEquals(result.length, 8);
  await assertSnapshot(t, result);
});

Deno.test("uniquePatterns function", async (t) => {
  const source = createSource();
  const result = uniquePatterns(source, 3, 4);
  assertEquals(result.length, 3);
  assertEquals(new Set(result).size, 3); // All patterns should be unique
  assert(result.every((pattern) => pattern.length === 4));
  await assertSnapshot(t, result);
});

Deno.test("uniquePatterns function with existing patterns", async (t) => {
  const source = createSource();
  const existing = ["abcd", "efgh"];
  const result = uniquePatterns(source, 2, 4, undefined, existing);
  assertEquals(result.length, 2);
  assert(!result.some((pattern) => existing.includes(pattern)));
  await assertSnapshot(t, result);
});

Deno.test("Determiner class - constructor", () => {
  const source = createSource();
  const determiner = new Determiner(source);
  assertExists(determiner.source);
  assertEquals(determiner.maxUInt32, 4294967296);
});

Deno.test("Determiner class - bytes method", async (t) => {
  const source = createSource();
  const determiner = new Determiner(source);
  const result = determiner.bytes(5);
  assertEquals(result.length, 5);
  await assertSnapshot(t, result);
});

Deno.test("Determiner class - uint64 method", async (t) => {
  const source = createSource();
  const determiner = new Determiner(source);
  const result = determiner.uint64();
  assert(typeof result === "bigint");
  assert(result >= 0n);
  assert(result <= 0xFFFFFFFFFFFFFFFFn);
  await assertSnapshot(t, result);
});

Deno.test("Determiner class - uint32 method", async (t) => {
  const source = createSource();
  const determiner = new Determiner(source);
  const result = determiner.uint32();
  assert(typeof result === "number");
  assert(result >= 0);
  assert(result <= 0xFFFFFFFF);
  await assertSnapshot(t, result);
});

Deno.test("Determiner class - uint16 method", async (t) => {
  const source = createSource();
  const determiner = new Determiner(source);
  const result = determiner.uint16();
  assert(typeof result === "number");
  assert(result >= 0);
  assert(result <= 0xFFFF);
  await assertSnapshot(t, result);
});

Deno.test("Determiner class - uint8 method", async (t) => {
  const source = createSource();
  const determiner = new Determiner(source);
  const result = determiner.uint8();
  assert(typeof result === "number");
  assert(result >= 0);
  assert(result <= 0xFF);
  await assertSnapshot(t, result);
});

Deno.test("Determiner class - integerLessThan method", async (t) => {
  const source = createSource();
  const determiner = new Determiner(source);
  const result = determiner.integerLessThan(100);
  assert(typeof result === "number");
  assert(result >= 0);
  assert(result < 100);
  await assertSnapshot(t, result);
});

Deno.test("Determiner class - integer method", async (t) => {
  const source = createSource();
  const determiner = new Determiner(source);
  const result = determiner.integer(10, 20);
  assert(typeof result === "number");
  assert(result >= 10);
  assert(result <= 20);
  await assertSnapshot(t, result);
});

Deno.test("Determiner class - pattern method", async (t) => {
  const source = createSource();
  const determiner = new Determiner(source);
  const result = determiner.pattern(6, "xyz");
  assertEquals(result.length, 6);
  assert(result.split("").every((char) => "xyz".includes(char)));
  await assertSnapshot(t, result);
});

Deno.test("Determiner class - uniquePatterns method", async (t) => {
  const source = createSource();
  const determiner = new Determiner(source);
  const result = determiner.uniquePatterns(4, 3);
  assertEquals(result.length, 4);
  assertEquals(new Set(result).size, 4);
  assert(result.every((pattern) => pattern.length === 3));
  await assertSnapshot(t, result);
});
