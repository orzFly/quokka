import { parseArgs } from "@std/cli/parse-args";
import * as path from "@std/path";

async function rewriteDenoJson(filePath: string, checkOnly: boolean) {
  const content = await Deno.readTextFile(filePath);
  const json = JSON.parse(content);
  const expectedContent = JSON.stringify(json, (key, value) => {
    if (Array.isArray(value)) {
      return value;
    }

    if (typeof value === "object" && value !== null) {
      return Object.keys(value).sort().reduce((result, field) => {
        if (
          key === "" && field === "workspace" && Array.isArray(value[field])
        ) {
          result[field] = value[field].sort();
        } else {
          result[field] = value[field];
        }
        return result;
      }, {} as Record<string, unknown>);
    }

    return value;
  }, 2) + "\n";
  const isSorted = content === expectedContent;

  if (!isSorted) {
    console.warn(`${filePath} is not sorted`);

    if (!checkOnly) {
      await Deno.writeTextFile(
        filePath,
        expectedContent,
      );
    }
  }

  return isSorted;
}

const dirname = path.dirname(path.dirname(path.fromFileUrl(import.meta.url)));

const parentDenoJson = path.join(dirname, "deno.json");
const parentContent = await Deno.readTextFile(parentDenoJson);
const parentJson = JSON.parse(parentContent);

const workspaces = parentJson.workspace as string[] || [];
const allDenoJsonFiles = [
  parentDenoJson,
  ...workspaces.map((ws) => path.join(dirname, ws, "deno.json")),
];

const args = parseArgs(Deno.args, {
  boolean: ["check"],
});

let isSorted = true;
for (const filePath of allDenoJsonFiles) {
  if (!await rewriteDenoJson(filePath, args.check)) {
    isSorted = false;
  }
}

if (args.check && !isSorted) {
  Deno.exit(1);
}
