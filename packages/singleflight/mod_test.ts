import { assert, assertEquals } from "@std/assert";
import { singleFlight } from "./mod.ts";

Deno.test("should not dedupe concurrent calls with different keys", async () => {
  let callCount = 0;
  const fn = singleFlight(async (i: number) => {
    await Promise.resolve();
    callCount++;
    return i * i;
  });

  const results = await Promise.all([fn(0), fn(1), fn(2)]);
  assertEquals(results, [0, 1, 4]);
  assertEquals(callCount, 3);
});

Deno.test("should dedupe concurrent calls with the same key", async () => {
  let callCount = 0;
  const fn = singleFlight(async (i: number) => {
    await Promise.resolve();
    callCount++;
    return i * i;
  });

  const results = await Promise.all([fn(3), fn(3), fn(3), fn(5)]);
  assertEquals(results, [9, 9, 9, 25]);
  assertEquals(callCount, 2);
});

Deno.test("should handle errors", async () => {
  const fn = singleFlight(() => {
    return Promise.reject(new Error("test error"));
  });

  try {
    await fn();
    throw new Error("should not reach here");
  } catch (err: unknown) {
    assert(err instanceof Error);
    assertEquals(err.message, "test error");
  }
});
