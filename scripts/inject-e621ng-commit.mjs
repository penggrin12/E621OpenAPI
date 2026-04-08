import { readFile, writeFile } from "node:fs/promises";

const [, , specPath] = process.argv;
const compareApiUrl = "https://api.github.com/repos/e621ng/e621ng/compare";
const fallbackCompareUrl = "https://github.com/e621ng/e621ng/commits/master";

if (!specPath) {
  console.error("Usage: node ./scripts/inject-e621ng-commit.mjs <spec-path>");
  process.exit(1);
}

const commit = (await readFile(new URL("../e621ng-commit", import.meta.url), "utf8")).trim();

if (!commit) {
  console.error("e621ng-commit is empty");
  process.exit(1);
}

async function getCompareMetadata() {
  const envBehindBy = process.env.E621NG_MASTER_BEHIND_BY?.trim();
  const envCompareUrl = process.env.E621NG_MASTER_COMPARE_URL?.trim();

  if (envBehindBy) {
    return {
      behindBy: envBehindBy,
      htmlUrl: envCompareUrl || fallbackCompareUrl
    };
  }

  const compareUrl = `${compareApiUrl}/${commit}...master`;

  try {
    const response = await fetch(compareUrl, {
      headers: {
        accept: "application/vnd.github+json",
        "user-agent": "e621-open-api-build"
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub compare request failed with ${response.status}`);
    }

    const compare = await response.json();
    const behindBy = typeof compare.ahead_by === "number" ? String(compare.ahead_by) : "unknown";
    const htmlUrl = typeof compare.html_url === "string" ? compare.html_url : fallbackCompareUrl;

    return { behindBy, htmlUrl };
  } catch (error) {
    console.warn(`Unable to fetch e621ng compare data for ${specPath}: ${error instanceof Error ? error.message : String(error)}`);
    return { behindBy: "unknown", htmlUrl: fallbackCompareUrl };
  }
}

const compareMetadata = await getCompareMetadata();
const spec = await readFile(specPath, "utf8");
const replacements = new Map([
  ["__E621NG_COMMIT__", commit],
  ["__E621NG_MASTER_BEHIND_BY__", compareMetadata.behindBy],
  ["__E621NG_MASTER_COMPARE_URL__", compareMetadata.htmlUrl]
]);

for (const placeholder of replacements.keys()) {
  if (!spec.includes(placeholder)) {
    console.error(`Placeholder ${placeholder} not found in ${specPath}`);
    process.exit(1);
  }
}

let output = spec;
for (const [placeholder, value] of replacements) {
  output = output.replaceAll(placeholder, value);
}

await writeFile(specPath, output);
