# OpenClaw Plugins 配置指南

> 依据 [Plugins](https://documentation.openclaw.ai/tools/plugin)、[Configuration reference - Plugins](https://documentation.openclaw.ai/gateway/configuration-reference#plugins)、[`openclaw plugins` CLI](https://documentation.openclaw.ai/cli/plugins)、[Manage plugins](https://documentation.openclaw.ai/plugins/manage-plugins) 及 [openclaw/openclaw](https://github.com/openclaw/openclaw) 仓库文档整理。

## 1. 配置文件位置

| 路径 | 说明 |
|------|------|
| `~/.openclaw/openclaw.json` | 主配置（JSON5，支持注释与尾逗号） |
| `~/.openclaw/extensions/` | 用户级插件安装目录 |
| `<workspace>/.openclaw/extensions/` | 工作区插件目录 |
| `<state>/plugins/installs.json` | 插件安装元数据（机器管理，勿手改） |

可通过 `OPENCLAW_CONFIG_PATH` 指向非默认配置文件。

---

## 2. `openclaw.json` 中 plugins 完整结构

```json5
{
  plugins: {
    // 总开关，默认 true
    enabled: true,

    // 白名单：非空时仅列出的插件可加载（也影响 bundled provider）
    allow: ["voice-call", "mrkhub"],

    // 黑名单：优先级高于 allow 与单插件 enabled
    deny: ["untrusted-plugin"],

    // bundled 插件发现策略，新配置默认 "allowlist"
    // "compat" 为迁移旧配置的兼容模式
    bundledDiscovery: "allowlist",

    // 额外插件加载路径（文件或目录）
    load: {
      paths: [
        "~/Projects/oss/voice-call-plugin",
        "./my-local-plugin",
      ],
    },

    // 独占槽位（同类插件同时只能激活一个）
    slots: {
      memory: "memory-core",      // 或 "memory-lancedb" / "none"
      contextEngine: "legacy",    // 或插件 id
    },

    // 每个插件的启用状态与配置
    entries: {
      "voice-call": {
        enabled: true,

        // 插件级 API Key 便捷字段（插件支持时）
        apiKey: "${TWILIO_API_KEY}",

        // 插件作用域环境变量
        env: {
          MY_VAR: "value",
        },

        // Hook 权限策略
        hooks: {
          // false：阻止 before_prompt_build 及旧版 before_agent_start 的 prompt 修改
          allowPromptInjection: false,
          // true：允许非 bundled 插件读取原始对话内容（llm_input/llm_output 等）
          allowConversationAccess: true,
        },

        // 子 agent 模型覆盖信任
        subagent: {
          allowModelOverride: true,
          allowedModels: ["openai/gpt-4o", "anthropic/claude-sonnet-4"],
        },

        // api.runtime.llm.complete 模型覆盖信任
        llm: {
          allowModelOverride: true,
          allowedModels: ["*"],
          allowAgentIdOverride: false,
        },

        // 插件自定义配置（由 openclaw.plugin.json 的 configSchema 校验）
        config: {
          provider: "twilio",
        },
      },
    },
  },
}
```

### 2.1 顶层字段说明

| 字段 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `plugins.enabled` | `boolean` | `true` | 总开关；`false` 时跳过全部插件发现/加载 |
| `plugins.allow` | `string[]` | — | 白名单；非空时**仅**列出的插件可加载或暴露工具 |
| `plugins.deny` | `string[]` | — | 黑名单；**始终优先于** allow 与 `entries.<id>.enabled` |
| `plugins.bundledDiscovery` | `"allowlist"` \| `"compat"` | `"allowlist"` | 控制 bundled provider 是否受 `allow` 约束 |
| `plugins.load.paths` | `string[]` | — | 额外插件路径；`--link` 安装也会写入此处 |
| `plugins.slots` | `object` | 见下 | 独占类别槽位选择 |
| `plugins.entries.<id>` | `object` | — | 单插件启用与配置 |

### 2.2 `plugins.entries.<id>` 字段说明

| 字段 | 说明 |
|------|------|
| `enabled` | 是否启用该插件；`false` 保留配置但不加载 |
| `apiKey` | 插件级 API Key（SecretRef 支持 `${ENV}`） |
| `env` | 插件作用域环境变量映射 |
| `hooks.allowPromptInjection` | 是否允许 prompt 注入类 hook |
| `hooks.allowConversationAccess` | 是否允许读取原始对话（`llm_input`、`llm_output`、`before_model_resolve`、`before_agent_reply`、`before_agent_run`、`before_agent_finalize`、`agent_end`） |
| `subagent.allowModelOverride` | 信任该插件为子 agent 请求模型覆盖 |
| `subagent.allowedModels` | 子 agent 允许的 `provider/model` 列表；`"*"` 表示任意 |
| `llm.allowModelOverride` | 信任该插件通过 `api.runtime.llm.complete` 覆盖模型 |
| `llm.allowedModels` | LLM 完成允许的模型列表 |
| `llm.allowAgentIdOverride` | 允许对非默认 agent id 调用 LLM |
| `config` | 插件业务配置，结构由插件 manifest 的 `configSchema` 定义 |

### 2.3 独占槽位 `plugins.slots`

| 槽位 | 控制内容 | 默认值 |
|------|----------|--------|
| `memory` | 活跃 memory 插件 | `memory-core` |
| `contextEngine` | 活跃 context engine | `legacy`（内置） |

```json5
{
  plugins: {
    slots: {
      memory: "memory-lancedb",  // 切换 LanceDB 长期记忆
      contextEngine: "none",     // 禁用 memory 插件时用 "none"
    },
  },
}
```

### 2.4 与 plugins 相关的其他 `openclaw.json` 配置

#### 聊天内插件命令

```json5
{
  commands: {
    plugins: true,  // 启用后可在聊天中使用 /plugin 命令
  },
}
```

聊天命令（与 CLI 安装解析器相同）：

```text
/plugin install clawhub:<package>
/plugin install git:github.com/owner/repo@v1.0.0
/plugin show <plugin-id>
/plugin enable <plugin-id>
```

#### 工具白名单（与 plugins 联动）

```json5
{
  tools: {
    allow: ["mrkhub_search", "mrkhub_install"],
  },
}
```

**注意：** `plugins.allow` 与 `tools.allow` 是两层控制：

- `plugins.allow` 非空时，未列入的插件**整体不加载**，其工具也不存在
- 即使 `tools.allow` 含 `"*"` 或具体工具名，若所属插件不在 `plugins.allow` 中仍不可用
- `openclaw doctor` 会警告此类配置冲突

#### 频道插件配置

频道插件的运行时/账号配置在 `channels.<channelId>` 下，不由中央 registry 定义，详见各插件 manifest 的 `channelConfigs`。

---

## 3. 插件发现顺序与启用规则

### 3.1 发现顺序（先匹配者优先）

1. `plugins.load.paths` — 显式路径
2. `<workspace>/.openclaw/extensions/*.ts` 及 `*/index.ts`
3. `~/.openclaw/extensions/*.ts` 及 `*/index.ts`
4. OpenClaw 内置 bundled 插件（`dist/extensions`）

支持的格式：

| 格式 | 标识 |
|------|------|
| Native | `openclaw.plugin.json` |
| Codex bundle | `.codex-plugin/plugin.json` |
| Claude bundle | `.claude-plugin/plugin.json` 或默认布局 |
| Cursor bundle | `.cursor-plugin/plugin.json` |

### 3.2 启用规则

- `plugins.enabled: false` → 全部插件禁用
- `plugins.deny` → 始终优先
- `plugins.entries.<id>.enabled: false` → 禁用单个插件
- 工作区来源插件**默认禁用**，需显式 `enabled: true`
- bundled 插件多数默认启用（model provider、speech、browser 等）
- 独占槽位可强制启用对应插件
- 配置变更**需 Gateway 重启**（托管 Gateway 通常自动重启）

---

## 4. 配置拆分（`$include`）

当 `plugins` 段由单文件 `$include` 引用时，CLI 的 install/update/enable/disable/uninstall 会**写透到被 include 的文件**，不修改 `openclaw.json` 根文件：

```json5
// openclaw.json
{
  plugins: { $include: "./plugins.json5" },
}
```

```json5
// plugins.json5
{
  enabled: true,
  entries: {
    mrkhub: { enabled: true, config: { /* ... */ } },
  },
}
```

根级 include、include 数组、带 sibling override 的 include **不支持**写透，会 fail closed。

---

## 5. 插件安装元数据（非用户配置）

安装/更新写入 `<state>/plugins/installs.json`：

- `installRecords` — 持久安装元数据（来源、版本、git commit、npm integrity 等）
- `plugins` — manifest 派生的冷启动 registry 缓存

**勿手动编辑。** 使用 `openclaw plugins registry --refresh` 重建。

旧版 `plugins.installs` 配置键会在 doctor 修复时迁移到 index 并移除。

---

## 6. CLI 命令完整参考

### 6.1 查询与搜索

```bash
# 列出已安装插件
openclaw plugins list
openclaw plugins list --enabled      # 仅已启用
openclaw plugins list --verbose      # 详细（来源/版本/激活状态）
openclaw plugins list --json         # JSON 输出（含 dependencyStatus）

# 搜索 ClawHub 可安装插件
openclaw plugins search "calendar"
openclaw plugins search "calendar" --limit 20
openclaw plugins search "calendar" --json
```

### 6.2 安装

```bash
# ClawHub
openclaw plugins install clawhub:openclaw-codex-app-server
openclaw plugins install clawhub:openclaw-codex-app-server@1.2.3
openclaw plugins install clawhub:openclaw-codex-app-server@beta

# npm（裸包名默认走 npm；ClawHub 优先于 npm 的版本以文档为准）
openclaw plugins install npm:@scope/openclaw-plugin
openclaw plugins install npm:@scope/openclaw-plugin@1.0.1
openclaw plugins install npm-pack:./my-plugin-1.0.0.tgz

# git
openclaw plugins install git:github.com/owner/repo
openclaw plugins install git:github.com/owner/repo@main
openclaw plugins install git:owner/repo@v1.0.0

# 本地路径 / 压缩包
openclaw plugins install ./my-plugin
openclaw plugins install ./my-plugin.tgz
openclaw plugins install -l ./my-plugin          # 链接模式（写入 plugins.load.paths，不复制）
openclaw plugins install --link ./my-plugin      # 同上

# Marketplace（Claude 兼容）
openclaw plugins marketplace list <marketplace-name>
openclaw plugins install <plugin-name>@<marketplace-name>
openclaw plugins install <plugin-name> --marketplace owner/repo
openclaw plugins install <plugin-name> --marketplace https://github.com/owner/repo
openclaw plugins install <plugin-name> --marketplace ./my-marketplace

# 安装选项
openclaw plugins install <spec> --force                          # 覆盖已有安装
openclaw plugins install <spec> --pin                              # npm：锁定精确版本
openclaw plugins install <spec> --dangerously-force-unsafe-install # 绕过危险代码扫描误报
```

**安装行为说明：**

- 已安装同 id 插件时，常规升级用 `plugins update`，强制重装用 `--force`
- `--pin` 仅 npm；不支持 `--marketplace` 与 `git:`
- `--force` 不支持与 `--link` 联用
- npm spec 仅支持包名 + 精确版本或 dist-tag，不支持 semver range
- 支持 `.zip`、`.tgz`、`.tar.gz`、`.tar` 归档
- 配置无效时 install 默认 fail closed，需先 `openclaw doctor --fix`
- 若 `plugins.allow` 已设置，install 会自动将新插件 id 加入 allowlist
- 若 id 在 `plugins.deny` 中，install 会移除 stale deny 条目

### 6.3 启用 / 禁用

```bash
openclaw plugins enable <id>    # 写 plugins.entries.<id>.enabled = true
openclaw plugins disable <id>   # 写 plugins.entries.<id>.enabled = false
```

Nix 模式（`OPENCLAW_NIX_MODE=1`）下 install/update/uninstall/enable/disable 被禁用。

### 6.4 更新

```bash
openclaw plugins update <id>                              # 按已记录的 install spec 更新
openclaw plugins update @scope/openclaw-plugin@beta       # 切换 dist-tag
openclaw plugins update @scope/openclaw-plugin            # 回到 registry 默认 release line
openclaw plugins update --all                             # 更新全部
openclaw plugins update <id> --dry-run                      # 预览
openclaw plugins update <id> --dangerously-force-unsafe-install
```

### 6.5 卸载

```bash
openclaw plugins uninstall <id>
openclaw plugins uninstall <id> --dry-run
openclaw plugins uninstall <id> --keep-files    # 保留安装目录文件
```

卸载会移除：`plugins.entries`、plugin index、allow/deny 中的条目、linked `load.paths`。活跃 memory 插件卸载后 slot 重置为 `memory-core`。

### 6.6 检查与诊断

```bash
# 静态检查（不加载 runtime）
openclaw plugins inspect <id>
openclaw plugins inspect <id> --json
openclaw plugins inspect --all
openclaw plugins info <id>              # inspect 别名

# 运行时检查（加载模块，验证 hooks/tools/CLI/gateway methods）
openclaw plugins inspect <id> --runtime
openclaw plugins inspect <id> --runtime --json

# 诊断
openclaw plugins doctor

# Registry
openclaw plugins registry
openclaw plugins registry --refresh     # 从 index + config 重建
openclaw plugins registry --json

# Bundled 插件运行时依赖
openclaw plugins deps
openclaw plugins deps --repair
openclaw plugins deps --prune
openclaw plugins deps --json
```

### 6.7 插件开发命令

```bash
openclaw plugins init <id>
openclaw plugins init <id> --directory ./my-plugin --name "My Plugin"
openclaw plugins build --entry ./dist/index.js
openclaw plugins build --entry ./dist/index.js --check   # CI：检查 manifest 是否过期
openclaw plugins validate --entry ./dist/index.js
```

### 6.8 相关 config CLI

```bash
openclaw config get plugins.entries.mrkhub.config
openclaw config set plugins.entries.mrkhub.enabled true
openclaw config set plugins.entries.mrkhub.config.repositories '["owner/repo"]'
openclaw config unset plugins.entries.brave.config.webSearch.apiKey
openclaw config schema                    # 含 plugins 段 JSON Schema
openclaw config validate
openclaw doctor --fix                     # 修复无效 plugin 配置、迁移 installs、重建 registry
```

### 6.9 Gateway 重启

```bash
openclaw gateway restart
openclaw gateway status --deep --require-rpc
```

插件代码/配置变更后需重启 Gateway 才能生效 runtime 注册。

---

## 7. 完整配置示例

### 7.1 安装并启用第三方插件（git + 工具白名单）

```bash
openclaw plugins install git:github.com/MeerkatAIChina/openclaw-mrkhub-plugin
openclaw plugins enable mrkhub
openclaw gateway restart
openclaw plugins inspect mrkhub --runtime --json
```

```json5
// ~/.openclaw/openclaw.json
{
  plugins: {
    entries: {
      mrkhub: {
        enabled: true,
        config: {
          repositories: [
            "MeerkatAIChina/manufacturing-ai-efficiency-Skill", // 默认扫描仓库内 skills/ 目录
            "https://github.com/MeerkatAIChina/foo/tree/main/skills",
          ],
          installDir: "~/.agents/skills",
          defaultRef: "main",
          githubToken: "${GITHUB_TOKEN}",
        },
      },
    },
  },
  commands: {
    plugins: true,
  },
  tools: {
    allow: ["mrkhub_search", "mrkhub_install"],
  },
}
```

### 7.2 白名单模式（安全部署）

```json5
{
  plugins: {
    enabled: true,
    allow: ["memory-core", "browser", "mrkhub"],
    deny: [],
    bundledDiscovery: "allowlist",
    entries: {
      mrkhub: { enabled: true, config: { /* ... */ } },
    },
  },
}
```

### 7.3 本地开发（link 模式）

```bash
openclaw plugins install --link ./my-plugin
openclaw plugins enable my-plugin
openclaw gateway restart
openclaw plugins inspect my-plugin --runtime --json
```

等效于在 `openclaw.json` 写入：

```json5
{
  plugins: {
    load: { paths: ["/absolute/path/to/my-plugin"] },
    entries: {
      "my-plugin": { enabled: true },
    },
  },
}
```

### 7.4 Voice Call 插件

```json5
{
  plugins: {
    allow: ["voice-call"],
    entries: {
      "voice-call": {
        enabled: true,
        config: { provider: "twilio" },
      },
    },
  },
}
```

### 7.5 Codex harness 内嵌插件

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          codexPlugins: {
            enabled: true,
            allow_destructive_actions: true,
            plugins: {
              "google-calendar": {
                enabled: true,
                marketplaceName: "openai-curated",
                pluginName: "google-calendar",
                allow_destructive_actions: false,
              },
            },
          },
        },
      },
    },
  },
}
```

仅对选择 native Codex harness 的 session 生效。

### 7.6 配置拆分到独立文件

```json5
// ~/.openclaw/openclaw.json
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
  plugins: { $include: "./plugins.json5" },
}
```

```json5
// ~/.openclaw/plugins.json5
{
  enabled: true,
  entries: {
    mrkhub: {
      enabled: true,
      config: {
        repositories: ["owner/repo"],
        installDir: "~/.agents/skills",
      },
    },
  },
}
```

---

## 8. 调试环境变量

```bash
# 安装/inspect 慢操作阶段追踪
OPENCLAW_PLUGIN_LIFECYCLE_TRACE=1 openclaw plugins install <spec>

# 插件加载 export 形状调试
OPENCLAW_PLUGIN_LOAD_DEBUG=1 openclaw plugins doctor

# 禁用 bundled 源码 overlay（Docker bind-mount 场景）
OPENCLAW_DISABLE_BUNDLED_SOURCE_OVERLAYS=1

# 紧急 registry 读取 fallback（已废弃，优先用 registry --refresh）
OPENCLAW_DISABLE_PERSISTED_PLUGIN_REGISTRY=1
```

工具工厂慢日志：

```bash
openclaw config set logging.level trace
openclaw logs --follow
# 查找 [trace:plugin-tools] factory timings ...
```

---

## 9. 常见问题

| 现象 | 可能原因 | 处理 |
|------|----------|------|
| 插件在 list 中但 hook/工具不生效 | Gateway 未重启 | `openclaw gateway restart` |
| 工具不可用 | `plugins.allow` 或 `tools.allow` 未包含 | 检查两层白名单 |
| install 失败 | 配置无效 | `openclaw doctor --fix` |
| 对话 hook 无数据 | 未授权 | 设 `hooks.allowConversationAccess: true` |
| 频道冲突 | 多个插件注册同一 channel id | `plugins list --enabled --verbose` + disable 其一 |
| npm 插件依赖缺失 | 未 install/update | `openclaw plugins update <id>` 或 `doctor --fix` |

---

## 10. 官方文档链接

- [Plugins 用户指南](https://documentation.openclaw.ai/tools/plugin)
- [Manage plugins 快速操作](https://documentation.openclaw.ai/plugins/manage-plugins)
- [`openclaw plugins` CLI 完整参考](https://documentation.openclaw.ai/cli/plugins)
- [Configuration reference - Plugins](https://documentation.openclaw.ai/gateway/configuration-reference#plugins)
- [Plugin manifest](https://documentation.openclaw.ai/plugins/manifest)
- [Building plugins](https://documentation.openclaw.ai/plugins/building-plugins)
- [Plugin architecture](https://documentation.openclaw.ai/plugins/architecture)
- [GitHub: docs/tools/plugin.md](https://github.com/openclaw/openclaw/blob/main/docs/tools/plugin.md)
- [GitHub: docs/cli/plugins.md](https://github.com/openclaw/openclaw/blob/main/docs/cli/plugins.md)
