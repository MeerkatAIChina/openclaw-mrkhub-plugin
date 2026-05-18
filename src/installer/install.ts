import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { SkillIndexEntry } from "../github/indexer.js";
import { GitHubClient } from "../github/client.js";
import type { MrkhubConfig } from "../config/types.js";
import { resolveInstallDir, skillInstallPath } from "./paths.js";

type GitHubContentItem = {
  name: string;
  path: string;
  type: "file" | "dir" | "symlink" | "submodule";
  download_url: string | null;
};

async function downloadFile(url: string, dest: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`下载失败 ${url}: ${res.status}`);
  }
  await mkdir(dirname(dest), { recursive: true });
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
}

async function copyRepoPath(
  client: GitHubClient,
  entry: SkillIndexEntry,
  destDir: string,
): Promise<void> {
  const { owner, repo, ref } = entry.repo;
  const url = client.repoContentsUrl(owner, repo, entry.path, ref);
  const items = await client.fetchJson<GitHubContentItem[]>(url);

  for (const item of items) {
    const target = join(destDir, item.name);
    if (item.type === "dir") {
      await mkdir(target, { recursive: true });
      const subEntry: SkillIndexEntry = {
        ...entry,
        path: item.path,
      };
      await copyRepoPath(client, subEntry, target);
    } else if (item.type === "file" && item.download_url) {
      await downloadFile(item.download_url, target);
    }
  }
}

export type InstallResult = {
  skillName: string;
  installPath: string;
};

export async function installSkill(
  config: MrkhubConfig,
  entry: SkillIndexEntry,
): Promise<InstallResult> {
  const installRoot = resolveInstallDir(config.installDir);
  const target = skillInstallPath(installRoot, entry.name);
  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });

  const client = new GitHubClient({ token: config.githubToken });
  await copyRepoPath(client, entry, target);

  return { skillName: entry.name, installPath: target };
}
