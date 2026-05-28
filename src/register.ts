import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk/plugin-entry";
import { handleMrkhubCommand, createMrkhubDeps } from "./command/mrkhub.js";
import { resolveConfig } from "./config/defaults.js";
import { findSkillByName, loadSkillIndex } from "./storage/indexer.js";
import { installSkill } from "./installer/install.js";
import type { MrkhubSessionState } from "./session/mrkhub-context.js";
import { searchSkills } from "./matcher/search.js";
import { toolTextResult } from "./tools/result.js";

const SearchParamsSchema = Type.Object({
  query: Type.String({ description: "Natural language or keyword query" }),
});

const InstallParamsSchema = Type.Object({
  skillName: Type.String(),
});

type SearchParams = Static<typeof SearchParamsSchema>;
type InstallParams = Static<typeof InstallParamsSchema>;

const sessionStore = new Map<string, MrkhubSessionState>();

function sessionKeyFromCtx(ctx: { sessionKey?: string; sessionId?: string }): string {
  return ctx.sessionKey ?? ctx.sessionId ?? "default";
}

export function registerMrkhubPlugin(api: OpenClawPluginApi): void {
  const pluginConfig = api.pluginConfig as Record<string, unknown> | undefined;

  api.registerCommand({
    name: "mrkhub",
    description: "Search and install Meerkat skills from OSS",
    acceptsArgs: true,
    handler: async (ctx) => {
      const args = (ctx.args ?? "").trim();
      const key = sessionKeyFromCtx(ctx);
      const deps = createMrkhubDeps(pluginConfig, sessionStore, key);
      try {
        const text = await handleMrkhubCommand(args, deps);
        return { text };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        api.logger.error(`mrkhub command failed: ${message}`);
        return { text: `mrkhub 执行失败：${message}` };
      }
    },
  });

  const config = () => resolveConfig(pluginConfig);

  api.registerTool(
    {
      name: "mrkhub_search",
      label: "mrkhub_search",
      description: "Search Meerkat skills in configured OSS bucket",
      parameters: SearchParamsSchema,
      async execute(_id, params) {
        const { query } = params as SearchParams;
        const index = await loadSkillIndex(config());
        const hits = searchSkills(index, query);
        return toolTextResult(
          JSON.stringify(
            hits.map((h) => ({
              name: h.name,
              description: h.description,
              path: h.path,
              source: h.baseUrl,
            })),
          ),
        );
      },
    },
    { optional: true },
  );

  api.registerTool(
    {
      name: "mrkhub_install",
      label: "mrkhub_install",
      description: "Install a Meerkat skill by name into ~/.agents/skills",
      parameters: InstallParamsSchema,
      async execute(_id, params) {
        const { skillName } = params as InstallParams;
        const entry = await findSkillByName(config(), skillName.toLowerCase());
        if (!entry) {
          return toolTextResult(`Skill not found: ${skillName}`);
        }
        const result = await installSkill(config(), entry);
        return toolTextResult(
          `Installed ${result.skillName} to ${result.installPath}. Run /new or restart gateway.`,
        );
      },
    },
    { optional: true },
  );
}
