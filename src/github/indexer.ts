import { parseRepositorySpec } from "../config/defaults.js";
import type { MrkhubConfig, ResolvedRepo } from "../config/types.js";
import { GitHubClient } from "./client.js";

export type SkillIndexEntry = {
  name: string;
  description: string;
  path: string;
  repo: ResolvedRepo;
  tags?: string[];
};

type GitHubContentItem = {
  name: string;
  path: string;
  type: "file" | "dir" | "symlink" | "submodule";
  download_url: string | null;
};

function parseSkillFrontmatter(raw: string): {
  name?: string;
  description?: string;
} {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    return {};
  }
  const block = match[1]!;
  const name = block.match(/^name:\s*(.+)$/m)?.[1]?.trim();
  const description = block.match(/^description:\s*(.+)$/m)?.[1]?.trim();
  return { name, description };
}

export function resolveRepositories(config: MrkhubConfig): ResolvedRepo[] {
  return config.repositories.map((spec) => {
    const parsed = parseRepositorySpec(spec, config.defaultRef);
    return {
      owner: parsed.owner,
      repo: parsed.repo,
      ref: parsed.ref,
      skillsPath: parsed.skillsPath,
    };
  });
}

export async function indexSkillsFromRepo(
  client: GitHubClient,
  repo: ResolvedRepo,
): Promise<SkillIndexEntry[]> {
  const url = client.repoContentsUrl(
    repo.owner,
    repo.repo,
    repo.skillsPath,
    repo.ref,
  );
  const items = await client.fetchJson<GitHubContentItem[]>(url);
  const dirs = items.filter((item) => item.type === "dir");
  const entries: SkillIndexEntry[] = [];

  for (const dir of dirs) {
    const skillMdUrl = client.rawFileUrl(
      repo.owner,
      repo.repo,
      `${dir.path}/SKILL.md`,
      repo.ref,
    );
    const res = await fetch(skillMdUrl);
    if (!res.ok) {
      continue;
    }
    const raw = await res.text();
    const meta = parseSkillFrontmatter(raw);
    const folderName = dir.name.toLowerCase().replace(/[^a-z0-9_]/g, "_");
    const name = (meta.name ?? folderName).toLowerCase();
    entries.push({
      name,
      description: meta.description ?? dir.name,
      path: dir.path,
      repo,
    });
  }

  return entries;
}

export async function loadSkillIndex(
  config: MrkhubConfig,
): Promise<SkillIndexEntry[]> {
  const client = new GitHubClient({ token: config.githubToken });
  const repos = resolveRepositories(config);
  const all: SkillIndexEntry[] = [];
  for (const repo of repos) {
    const entries = await indexSkillsFromRepo(client, repo);
    all.push(...entries);
  }
  return all;
}

export async function findSkillByName(
  config: MrkhubConfig,
  skillName: string,
): Promise<SkillIndexEntry | undefined> {
  const index = await loadSkillIndex(config);
  return index.find((e) => e.name === skillName);
}
