import { handleMrkhubCommand, createMrkhubDeps } from "../dist/command/mrkhub.js";

const sessionStore = new Map();

async function run(label, args) {
  const deps = createMrkhubDeps(undefined, sessionStore, "smoke-session");
  const text = await handleMrkhubCommand(args, deps);
  console.log(`\n=== ${label} ===\n`);
  console.log(text);
}

console.log("mrkhub smoke test");
console.log("Node", process.version);

await run("help", "");
await run("search", "制造业 AI 提效");

const state = sessionStore.get("smoke-session");
if (state?.lastResults?.length) {
  await run("install-follow-up", "那就安装第一个");
}

console.log("\nSmoke test done.");
