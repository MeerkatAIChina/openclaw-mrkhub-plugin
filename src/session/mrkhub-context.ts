import type { SearchHit } from "../matcher/search.js";

export type MrkhubSessionState = {
  lastResults: SearchHit[];
  updatedAt: number;
};

export function createEmptySessionState(): MrkhubSessionState {
  return { lastResults: [], updatedAt: 0 };
}

export function formatSearchResults(hits: SearchHit[]): string {
  if (hits.length === 0) {
    return "未找到匹配的 skill。可换关键词重试，或检查插件配置的 GitHub 仓库。";
  }
  const lines = hits.map(
    (h, i) =>
      `${i + 1}. **${h.name}** — ${h.description}\n   路径: \`${h.path}\` (${h.repo.owner}/${h.repo.repo})`,
  );
  return `找到 ${hits.length} 个候选 skill：\n\n${lines.join("\n\n")}\n\n安装示例：\`/mrkhub 安装 ${hits[0]!.name}\``;
}

export function resolveInstallNameFromSession(
  state: MrkhubSessionState,
  text: string,
): string | undefined {
  const lower = text.toLowerCase();
  const ordinals: Record<string, number> = {
    第一个: 0,
    第一: 0,
    第二个: 1,
    第二: 1,
    第三个: 2,
    第三: 2,
  };
  for (const [key, idx] of Object.entries(ordinals)) {
    if (lower.includes(key) && state.lastResults[idx]) {
      return state.lastResults[idx]!.name;
    }
  }
  if (/那就|这个|那个/.test(text) && state.lastResults[0]) {
    const explicit = text.match(/[`'"]?([a-z][a-z0-9_-]{1,63})[`'"]?/i);
    if (explicit?.[1]) {
      return explicit[1].toLowerCase();
    }
    return state.lastResults[0].name;
  }
  return undefined;
}
