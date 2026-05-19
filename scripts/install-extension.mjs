import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { execSync as run } from "node:child_process";

const root = process.cwd();
const target = join(homedir(), ".openclaw", "extensions", "mrkhub");

mkdirSync(target, { recursive: true });
cpSync(join(root, "dist"), join(target, "dist"), { recursive: true });
cpSync(join(root, "openclaw.plugin.json"), join(target, "openclaw.plugin.json"));

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const minimal = {
  name: pkg.name,
  version: pkg.version,
  type: pkg.type,
  openclaw: pkg.openclaw,
  dependencies: pkg.dependencies,
};
writeFileSync(join(target, "package.json"), JSON.stringify(minimal, null, 2));

run("pnpm install --prod", { cwd: target, stdio: "inherit" });

console.log(`Installed dev extension to ${target}`);
console.log("Run: pnpm exec openclaw plugins enable mrkhub");
console.log("Run: pnpm exec openclaw plugins inspect mrkhub --runtime --json");
