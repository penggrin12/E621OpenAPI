import { readFile, writeFile } from "node:fs/promises";

const [, , specPath] = process.argv;

if (!specPath) {
  console.error("Usage: node ./scripts/inject-e621ng-commit.mjs <spec-path>");
  process.exit(1);
}

const commit = (await readFile(new URL("../e621ng-commit", import.meta.url), "utf8")).trim();

if (!commit) {
  console.error("e621ng-commit is empty");
  process.exit(1);
}

const spec = await readFile(specPath, "utf8");
const placeholder = "__E621NG_COMMIT__";

if (!spec.includes(placeholder)) {
  console.error(`Placeholder ${placeholder} not found in ${specPath}`);
  process.exit(1);
}

await writeFile(specPath, spec.replaceAll(placeholder, commit));
