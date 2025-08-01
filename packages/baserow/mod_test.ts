import { assertEquals } from "@std/assert";
import { BaserowInstance } from "./mod.ts";

Deno.test(function addTest() {
  const instance = new BaserowInstance("https://example.com/api/database/v3/", {
    Authorization: "Token 1234567890",
  });

  assertEquals(instance.backend, "https://example.com/api/database/v3");
  assertEquals(instance.header, { Authorization: "Token 1234567890" });
});
