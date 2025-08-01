import { assertEquals } from "@std/assert";
import { BaserowInstance } from "./mod.ts";

Deno.test(function addTest() {
  const instance = new BaserowInstance("https://api.baserow.io/api/database/v3/", {
    Authorization: "Token 1234567890",
  });

  assertEquals(instance.backend, "https://api.baserow.io/api/database/v3");
  assertEquals(instance.header, { Authorization: "Token 1234567890" });
});
