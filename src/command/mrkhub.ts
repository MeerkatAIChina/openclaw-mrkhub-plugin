import { resolveConfig } from "../config/defaults.js";
import type { MrkhubConfig } from "../config/types.js";
import { findSkillByName, loadSkillPositions } from "../storage/indexer.js";
import { installSkill } from "../installer/install.js";
import { parseIntent } from "../intent/parse.js";
import { searchSkills } from "../matcher/search.js";
import {
  createEmptySessionState,
  formatSearchResults,
  resolveInstallNameFromSession,
  type MrkhubSessionState,
} from "../session/mrkhub-context.js";

export type MrkhubCommandDeps = {
  getConfig: () => MrkhubConfig;
  getSessionState: () => MrkhubSessionState;
  setSessionState: (state: MrkhubSessionState) => void;
};

const HELP_TEXT = `**Meerkat Skills Hub** (\`/mrkhub\`)

- 查找：\`/mrkhub 产品市场调研\`
- 安装：\`/mrkhub 安装 manufacturing_value_chain\`
- 多轮：先搜索后 \`/mrkhub 安装\` 或 \`/mrkhub 那就安装第一个\`

安装后请执行 \`/new\` 或 \`openclaw gateway restart\` 以加载新 skill。`;

export async function handleMrkhubCommand(
  args: string,
  deps: MrkhubCommandDeps,
): Promise<string> {
  const config = deps.getConfig();
  const session = deps.getSessionState();
  const intent = parseIntent(args);

  if (intent.kind === "help") {
    return HELP_TEXT;
  }

  if (intent.kind === "search") {
    const index = await loadSkillPositions(config);
    const hits = searchSkills(index, intent.query);
    const next: MrkhubSessionState = {
      lastResults: hits,
      updatedAt: Date.now(),
    };
    deps.setSessionState(next);
    return formatSearchResults(hits);
  }

  let skillName =
    intent.kind === "install" ? intent.skillName : "";
  if (!skillName) {
    skillName = resolveInstallNameFromSession(session, args) ?? "";
  }

  if (!skillName) {
    return "请指定要安装的 skill 名称，例如：`/mrkhub 安装 manufacturing_value_chain`";
  }

  const entry = await findSkillByName(config, skillName);
  if (!entry) {
    return `未找到 skill \`${skillName}\`。请先 \`/mrkhub <关键词>\` 搜索，或检查技能索引。`;
  }

  const result = await installSkill(config, entry);
  return `已安装 **${result.skillName}** 到 \`${result.installPath}\`。\n\n请执行 \`/new\` 或 \`openclaw gateway restart\` 后使用新 skill。`;
}

export function createMrkhubDeps(
  pluginConfig: Record<string, unknown> | undefined,
  sessionStore: Map<string, MrkhubSessionState>,
  sessionKey: string,
): MrkhubCommandDeps {
  const config = resolveConfig(pluginConfig);
  return {
    getConfig: () => config,
    getSessionState: () => sessionStore.get(sessionKey) ?? createEmptySessionState(),
    setSessionState: (state) => {
      sessionStore.set(sessionKey, state);
    },
  };
}
