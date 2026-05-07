import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const skipCommit = process.env.SKIP_COMMIT === "true" || process.env.SKIP_COMMIT === "1";

const changedFiles = execFileSync("git", ["diff", "--name-only", "HEAD~1", "HEAD"], {
  encoding: "utf8",
})
  .trim()
  .split("\n")
  .filter(Boolean);

if (changedFiles.some((file) => file.startsWith(".changeset/"))) {
  console.log("Changeset already exists, skipping");
  process.exit(0);
}

const commitBody = execFileSync("git", ["show", "--format=%B", "--no-patch", "HEAD"], {
  encoding: "utf8",
});

const updates = commitBody
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line.startsWith("|") && !line.includes("---"))
  .map((line) =>
    line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim()),
  )
  .filter(([datasource, packageName, from, to]) => datasource && packageName && from && to)
  .filter(([datasource]) => datasource !== "datasource")
  .map(([, packageName, , to]) => ({ packageName, to }));

if (updates.length === 0) {
  console.log("No Renovate dependency table found, skipping");
  process.exit(0);
}

const diff = execFileSync("git", ["diff", "HEAD~1", "HEAD"], { encoding: "utf8" });
const specifiers = new Map();

for (const line of diff.split("\n")) {
  if (!line.startsWith("+") || line.startsWith("+++")) continue;

  const jsonDependency = line.match(/^\+\s+"([^"]+)":\s+"([^"]+)"/);
  if (jsonDependency) {
    specifiers.set(jsonDependency[1], jsonDependency[2]);
    continue;
  }

  const yamlDependency = line.match(/^\+\s+["']?([^"':]+)["']?:\s+(.+)$/);
  if (yamlDependency) {
    specifiers.set(yamlDependency[1], yamlDependency[2].trim());
  }
}

const shortSha = execFileSync("git", ["rev-parse", "--short", "HEAD"], {
  encoding: "utf8",
}).trim();
const packageName = JSON.parse(readFileSync("package/package.json", "utf8")).name;
const changesetFiles = updates.map(({ packageName: dependencyName, to }) => {
  const specifier = specifiers.get(dependencyName) ?? to;
  const slug = dependencyName
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const fileName = `.changeset/renovate-${shortSha}-${slug}.md`;
  const message = [
    "---",
    `'${packageName}': patch`,
    "---",
    "",
    `Updated dependency \`${dependencyName}\` to \`${specifier}\`.`,
    "",
  ].join("\n");

  return { fileName, message };
});

mkdirSync(".changeset", { recursive: true });
for (const { fileName, message } of changesetFiles) {
  writeFileSync(fileName, message);
}

if (skipCommit) {
  console.log(`Created ${changesetFiles.length} changesets`);
  process.exit(0);
}

execFileSync("git", ["add", ...changesetFiles.map(({ fileName }) => fileName)], { stdio: "inherit" });
execFileSync("git", ["commit", "-m", "chore: add renovate changesets"], { stdio: "inherit" });
execFileSync("git", ["push"], { stdio: "inherit" });
