import { homedir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";

const SKILL_NAME_MAX_LEN = 63;
const SKILL_NAME_RE = new RegExp(`^[a-z][a-z0-9_]{0,${SKILL_NAME_MAX_LEN}}$`);

export function defaultInstallDir(): string {
  return join(homedir(), ".agents", "skills");
}

export function resolveInstallDir(configured?: string): string {
  const base = configured?.trim() || defaultInstallDir();
  return resolve(base);
}

export function assertValidSkillName(name: string): void {
  if (!SKILL_NAME_RE.test(name)) {
    throw new Error(
      `无效的 skill 名称 "${name}"，仅允许 a-z、0-9、下划线，且以字母开头，最长 ${SKILL_NAME_MAX_LEN + 1} 字符`,
    );
  }
}

export function skillInstallPath(installDir: string, skillName: string): string {
  assertValidSkillName(skillName);
  const root = resolveInstallDir(installDir);
  const target = resolve(root, skillName);
  const rel = relative(root, target);
  if (rel.startsWith("..") || isAbsolute(rel)) {
    throw new Error("安装路径越界");
  }
  return target;
}
