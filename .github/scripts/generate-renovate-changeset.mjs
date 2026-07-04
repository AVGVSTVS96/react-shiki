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

const hasDependencyTable = commitBody
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
  .some(([datasource]) => datasource !== "datasource");

if (!hasDependencyTable) {
  console.log("No Renovate dependency table found, skipping");
  process.exit(0);
}

const shortSha = execFileSync("git", ["rev-parse", "--short", "HEAD"], {
  encoding: "utf8",
}).trim();
const packageName = JSON.parse(readFileSync("package/package.json", "utf8")).name;
const fileName = `.changeset/renovate-${shortSha}.md`;
const message = ["---", `'${packageName}': patch`, "---", "", "Updated dependencies", ""].join(
  "\n",
);

mkdirSync(".changeset", { recursive: true });
writeFileSync(fileName, message);

if (skipCommit) {
  console.log(`Created changeset ${fileName}`);
  process.exit(0);
}

execFileSync("git", ["add", fileName], { stdio: "inherit" });
execFileSync("git", ["commit", "-m", "chore: add renovate changeset"], { stdio: "inherit" });
execFileSync("git", ["push"], { stdio: "inherit" });
