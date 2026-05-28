import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { SkillIndexEntry } from "../storage/indexer.js";
import { fetchBuffer, getSkillFileUrl } from "../oss/client.js";
import type { MrkhubConfig } from "../config/types.js";
import { resolveInstallDir, skillInstallPath } from "./paths.js";

async function downloadFile(url: string, dest: string): Promise<void> {
  const buf = await fetchBuffer(url);
  await mkdir(dirname(dest), { recursive: true });
  await writeFile(dest, buf);
}

/**
 * 从 OSS 安装 skill
 * 如果有 files 列表，下载列表中的所有文件
 * 否则回退到只下载 SKILL.md
 */
async function downloadSkillFiles(
  entry: SkillIndexEntry,
  destDir: string,
): Promise<void> {
  // 如果有 files 列表，下载所有文件
  if (entry.files && entry.files.length > 0) {
    const errors: string[] = [];

    for (const filePath of entry.files) {
      try {
        const url = getSkillFileUrl(entry.baseUrl, entry.path, filePath);
        const dest = join(destDir, filePath);
        await downloadFile(url, dest);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`${filePath}: ${message}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`下载文件失败:\n${errors.join("\n")}`);
    }
    return;
  }

  // 向后兼容：如果没有 files 列表，只下载 SKILL.md
  const skillMdUrl = getSkillFileUrl(entry.baseUrl, entry.path, "SKILL.md");
  const skillMdDest = join(destDir, "SKILL.md");
  await downloadFile(skillMdUrl, skillMdDest);
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

  await downloadSkillFiles(entry, target);

  return { skillName: entry.name, installPath: target };
}
