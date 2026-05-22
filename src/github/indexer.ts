import { parseRepositorySpec } from "../config/defaults.js";
import type { MrkhubConfig, ResolvedRepo } from "../config/types.js";
import { GitHubClient } from "./client.js";
import {
  normalizeSkillId,
  parseSkillIndexYaml,
  type SkillIndexYamlEntry,
} from "./skill-index.js";

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
  const strip = (v: string) => v.trim().replace(/^["']|["']$/g, "");
  const name = block.match(/^name:\s*(.+)$/m)?.[1];
  const description = block.match(/^description:\s*(.+)$/m)?.[1];
  return {
    name: name ? strip(name) : undefined,
    description: description ? strip(description) : undefined,
  };
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

const SKILL_INDEX_FILE = "skill-index.yaml";

function entryFromSkillIndexItem(
  item: SkillIndexYamlEntry,
  repo: ResolvedRepo,
): SkillIndexEntry | undefined {
  const name = normalizeSkillId(item.skill_id);
  if (!name) {
    return undefined;
  }
  const tags = [item.category, item.type].filter(
    (t): t is string => typeof t === "string" && t.length > 0,
  );
  return {
    name,
    description: item.name,
    path: item.path,
    repo,
    tags: tags.length > 0 ? tags : undefined,
  };
}

async function indexSkillsFromSkillIndexFile(
  client: GitHubClient,
  repo: ResolvedRepo,
): Promise<SkillIndexEntry[] | undefined> {
  const url = client.rawFileUrl(
    repo.owner,
    repo.repo,
    SKILL_INDEX_FILE,
    repo.ref,
  );
  const res = await fetch(url);
  if (res.status === 404) {
    return undefined;
  }
  if (!res.ok) {
    throw new Error(`读取 ${SKILL_INDEX_FILE} 失败: ${res.status}`);
  }
  const raw = await res.text();
  const items = parseSkillIndexYaml(raw);
  if (items.length === 0) {
    return undefined;
  }
  return items
    .map((item) => entryFromSkillIndexItem(item, repo))
    .filter((entry): entry is SkillIndexEntry => entry !== undefined);
}

export async function indexSkillsFromRepo(
  client: GitHubClient,
  repo: ResolvedRepo,
): Promise<SkillIndexEntry[]> {
  const fromIndex = await indexSkillsFromSkillIndexFile(client, repo);
  if (fromIndex) {
    return fromIndex;
  }

  const url = client.repoContentsUrl(
    repo.owner,
    repo.repo,
    repo.skillsPath,
    repo.ref,
  );
  const items = await client.fetchJson<GitHubContentItem[]>(url);
  const entries: SkillIndexEntry[] = [];

  const rootSkillMd = items.find(
    (item) => item.type === "file" && item.name === "SKILL.md",
  );
  if (rootSkillMd?.download_url) {
    const res = await fetch(rootSkillMd.download_url);
    if (res.ok) {
      const raw = await res.text();
      const meta = parseSkillFrontmatter(raw);
      const folderName = repo.skillsPath
        .split("/")
        .pop()!
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "_");
      const rawName = (meta.name ?? folderName).toLowerCase();
      const name = rawName.replace(/[^a-z0-9_]/g, "_").replace(/^_+/, "");
      entries.push({
        name: name || folderName,
        description: meta.description ?? folderName,
        path: repo.skillsPath,
        repo,
      });
    }
  }

  const dirs = items.filter((item) => item.type === "dir");
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
    const rawName = (meta.name ?? folderName).toLowerCase();
    const name = rawName.replace(/[^a-z0-9_]/g, "_").replace(/^_+/, "") || folderName;
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
  const normalized = normalizeSkillId(skillName);
  return index.find((e) => e.name === normalized);
}
