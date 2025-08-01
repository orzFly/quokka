import $ from "@david/dax";
import * as fs from "node:fs/promises";

const releaseFile = await fs.readFile("./Releases.md", "utf-8");
const lines = releaseFile.split("\n");
const latestReleaseIndex = lines.findIndex((x: string) => x.startsWith("### "));
const latestRelease = lines[latestReleaseIndex]!.split(" ")[1];

const nextReleaseOffset = lines.slice(latestReleaseIndex + 1).findIndex((
  x: string,
) => x.startsWith("### "));
const releaseNotes = lines.slice(
  latestReleaseIndex + 1,
  nextReleaseOffset >= 0
    ? nextReleaseOffset + latestReleaseIndex + 1
    : undefined,
).join("\n").trim();

console.log(`===========`);
console.log(releaseNotes);
console.log(`===========`);

const tag = `release-${latestRelease}`;

await $`git tag ${tag}`;
await $`git push origin ${tag}`;
