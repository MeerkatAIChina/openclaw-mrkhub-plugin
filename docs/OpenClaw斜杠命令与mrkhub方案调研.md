# OpenClaw 斜杠命令与 mrkhub 方案调研

> 整理日期：2026-05-18  
> 依据：[Slash commands](https://documentation.openclaw.ai/tools/slash-commands)、[Skills](https://documentation.openclaw.ai/tools/skills)、[Creating skills](https://documentation.openclaw.ai/tools/creating-skills)、[Plugin SDK](https://documentation.openclaw.ai/plugins/sdk-overview)、[Plugins CLI](https://docs.openclaw.ai/cli/plugins) 及上游仓库说明。

---

## 1. OpenClaw 能否自定义斜杠命令？

**可以，但不能仅在 `openclaw.json` 里任意新增命令名。**

斜杠命令由 Gateway 处理，来源分为四类：

| 来源 | 说明 |
|------|------|
| 核心内置 | `/new`、`/model`、`/status` 等 |
| 通道插件生成 | 如 `/dock-discord` |
| 捆绑插件 | 如 `/dreaming`、`/pair`（`registerCommand()`） |
| 用户可调用 Skill | `user-invocable: true` 时暴露为斜杠命令 |

`openclaw.json` 中的 `commands` 配置块仅控制**内置命令的开关**及 Discord/Telegram/Slack 上的**原生注册**，不能定义新的命令名。

查看当前环境可用命令：发送 `/commands` 或 `/help`。

### 相关配置示例

```json5
{
  commands: {
    native: "auto",           // Discord/Telegram 原生 / 命令
    nativeSkills: "auto",     // Skill 注册为原生斜杠
    text: true,
    bash: false,
    config: false,
    plugins: false,
    // ...
  },
}
```

---

## 2. Skill 与 Plugin 两种方式对比

| 维度 | Skill（`user-invocable: true`） | 插件（`api.registerCommand()`） |
|------|--------------------------------|--------------------------------|
| **写法** | `SKILL.md` + YAML frontmatter | TypeScript 插件 + manifest |
| **默认执行** | 多数作为普通消息**交给模型**，由 Skill 说明引导 | **默认绕过 LLM**，在 handler 中直接处理 |
| **确定性逻辑** | 可设 `command-dispatch: tool` 直连工具 | handler 内任意逻辑；可用 `continueAgent: true` 再把剩余内容交给 agent |
| **复杂度** | 低，适合工作区快速添加 | 高，需打包、安装、走插件生命周期 |
| **安装** | `~/.openclaw/workspace/skills/` 等 | `openclaw plugins install …` |
| **命令名** | 由 skill `name` 规范为 `a-z0-9_`（最长 32） | 在 `registerCommand` 中显式定义 |
| **典型用途** | 固定工作流、快捷 prompt | 配对、状态、渠道控制、安装器等需代码的逻辑 |

### 执行路径

**Skill：**

```
/xxx [参数]  →  默认：剥命令后当普通消息进 agent
              →  command-dispatch: tool：直接调工具，不走模型
```

**插件：**

```
/xxx [参数]  →  默认：插件 handler 直接回复
              →  continueAgent: true：handler 后可继续交给 agent
```

### Skill 可选 frontmatter

```yaml
user-invocable: true              # 暴露为斜杠命令
disable-model-invocation: true    # 不出现在常规 prompt，仍可斜杠调用
command-dispatch: tool            # 直连工具
command-tool: <tool_name>
```

通用入口 `/skill [input]` 始终可用。

---

## 3. `/mrkhub` 场景分析与方案建议

### 3.1 需求摘要

自定义斜杠命令 `/mrkhub`，从**自有 GitHub 仓库**（非官方 ClawHub）查询、匹配、安装 skills。

**仓库示例：**  
https://github.com/MeerkatAIChina/manufacturing-ai-efficiency-Skill/tree/main/manufacturing-ai-efficiency-pro

| 场景 | 用户输入示例 | 期望行为 |
|------|-------------|----------|
| 查找 | `/mrkhub 我需要一个能进行产品市场调研的 skills` | 在仓库中语义匹配，返回推荐列表 |
| 安装 | `/mrkhub 那就给我安装 manufacturing_value_chain 这个 skills 吧` | 定位 skill，下载到 `~/.agents/skills/` |

### 3.2 为何不适合单独用 Skill

- **安装**需确定性落盘、路径校验，不能依赖模型是否记得 `exec` 或路径是否正确。
- **检索**需对接固定 GitHub 目录结构，Skill 本身无代码执行能力。
- **`command-dispatch: tool`** 仍须插件注册工具，等于仍要写插件。
- **多轮指代**（「那就安装 xxx」）需在 handler 或 session 中维护上下文。

### 3.3 推荐方案：插件为主

```
openclaw-mrkhub-plugin/
├── registerCommand({ name: "mrkhub", handler })
├── registerTool(mrkhub_search)    // 可选
├── registerTool(mrkhub_install)   // 可选
└── 内部模块
    ├── githubIndex.ts      // 列仓库、读 SKILL.md / 元数据
    ├── matcher.ts          // 关键词 + 可选 LLM 排序
    └── installer.ts        // clone/sparse checkout → ~/.agents/skills/
```

**Handler 分两路：**

1. **search** — 拉索引 → 匹配 1～N 个 skill → 返回名称、路径、说明；可选写入 session 供后续「安装」解析。
2. **install** — 解析 skill 名 → 从固定 repo 子路径复制到 `~/.agents/skills/<name>/` → 提示用户 `/new` 或 `openclaw gateway restart`。

自然语言意图：规则（含「安装」+ skill 名）+ 可选 LLM 输出 `{ intent, skillName }` JSON。

可选：增加**不** `user-invocable` 的薄 Skill，仅说明「查/装 Meerkat skills 时用 mrkhub 工具」，斜杠入口仍以插件为准。

### 3.4 Skills 安装目标路径

安装到 `~/.agents/skills/` 符合官方 [Skills 加载优先级](https://documentation.openclaw.ai/tools/skills)（`~/.agents/skills/` 为共享 agent 配置）。装完后需 `/new` 或重启 Gateway 以加载新 skill。

---

## 4. 插件分发与 ClawHub：是否鸡生蛋？

**不会必然鸡生蛋。** 插件安装与 Skills 分发是两层：

| 层级 | 内容 | 是否必须 ClawHub |
|------|------|------------------|
| 插件 | 提供 `/mrkhub`、GitHub 检索、安装逻辑 | **否** |
| Skills | 业务技能包（如 `manufacturing_value_chain`） | **否**（由 `/mrkhub` 从自有 GitHub 拉） |

仅当「安装 mrkhub 插件」也绑死在 ClawHub 上时，才会形成循环依赖。应避免：**首次引导用 Git/本地/安装脚本装插件，日常使用 `/mrkhub` 装 skills。**

### 4.1 插件安装方式（官方 CLI）

```bash
# 从 GitHub 安装（推荐）
openclaw plugins install git:github.com/MeerkatAIChina/openclaw-mrkhub-plugin

# 指定分支或 tag
openclaw plugins install git:github.com/MeerkatAIChina/openclaw-mrkhub-plugin@main

# 本地目录（开发）
openclaw plugins install ./path/to/openclaw-mrkhub-plugin

# 私有 npm（若有）
openclaw plugins install @meerkat/openclaw-mrkhub-plugin

# 仅以下形式走 ClawHub
openclaw plugins install clawhub:some-package
```

安装后：

```bash
openclaw gateway restart
```

聊天内也可用（需 `commands.plugins: true`）：`/plugins install git:github.com/...`

### 4.2 仓库组织建议

**方案 A：两个仓库**

- `openclaw-mrkhub-plugin` — 插件，安装一次  
- `manufacturing-ai-efficiency-Skill` — skills 目录，由 `/mrkhub` 索引/下载  

**方案 B：单仓库多目录**

- 同 repo 内 `plugin/` + `skills/*`  
- 插件：`plugins install git:...`  
- `/mrkhub` 配置中写死 skills 根路径  

### 4.3 建议落地顺序

```
首次安装（installer / 文档，一次性）
  → openclaw plugins install git:github.com/MeerkatAIChina/openclaw-mrkhub-plugin
  → openclaw gateway restart

日常使用
  → /mrkhub 查 skills
  → /mrkhub 安装 xxx
  → /new 或 gateway restart
```

可与现有 `openclaw-installer` 集成：安装 OpenClaw 后自动执行上述 `plugins install git:...`，业务 skills 不再走 ClawHub 预设列表。

---

## 5. 结论速查

| 问题 | 结论 |
|------|------|
| 能否自定义斜杠命令？ | 能，通过 Skill（`user-invocable`）或插件（`registerCommand`） |
| 能否只在 json 里配置新命令？ | 不能 |
| `/mrkhub` 用 Skill 还是插件？ | **插件为主** |
| 插件是否必须从 ClawHub 获取？ | **否**，可用 `git:github.com/...`、本地路径、npm |
| 开发插件后如何从 GitHub 安装？ | `openclaw plugins install git:github.com/组织/仓库名` |

---

## 6. 参考链接

- [Slash commands](https://documentation.openclaw.ai/tools/slash-commands)
- [Skills](https://documentation.openclaw.ai/tools/skills)
- [Creating skills](https://documentation.openclaw.ai/tools/creating-skills)
- [Skills config](https://documentation.openclaw.ai/tools/skills-config)
- [Building Plugins](https://documentation.openclaw.ai/plugins/building-plugins)
- [Plugin SDK Overview](https://documentation.openclaw.ai/plugins/sdk-overview)
- [Plugins CLI](https://docs.openclaw.ai/cli/plugins)
- [GitHub: slash-commands 文档](https://github.com/openclaw/openclaw/blob/main/docs/tools/slash-commands.md)
- [Feature: Custom slash command API #58149](https://github.com/openclaw/openclaw/issues/58149)

---

## 7. 自有仓库（业务相关）

- Skills 源仓库：https://github.com/MeerkatAIChina/manufacturing-ai-efficiency-Skill/tree/main/manufacturing-ai-efficiency-pro
