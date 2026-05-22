# @meerkat-ai/openclaw-mrkhub-plugin

OpenClaw 插件：通过 `/mrkhub` 从**自有 GitHub 仓库**检索并安装 Meerkat skills（不依赖 ClawHub）。

## 功能

- **斜杠命令** `/mrkhub`：搜索、安装 skills，默认不经过 LLM
- **语义/关键词匹配**：在配置的 GitHub 仓库中列出候选 skill
- **确定性安装**：下载到 `~/.agents/skills/<name>/`，路径与名称校验
- **多轮对话**：支持「那就安装第一个」等指代（基于会话内上次搜索结果）
- **可选 Agent 工具**：`mrkhub_search`、`mrkhub_install`（需在 `tools.allow` 中启用）

## 前置条件

| 项 | 要求 |
|----|------|
| Node.js | ≥ 22.19 |
| OpenClaw Gateway | ≥ 2026.5.12（与 `package.json` 中 `openclaw.compat` 一致） |
| GitHub Token | 可选；公开仓库可不配，私有仓库或高频调用建议配置 |

## 快速开始

```bash
# 1. 构建插件（git 安装前必须已有 dist/）
git clone https://github.com/MeerkatAIChina/openclaw-mrkhub-plugin.git
cd openclaw-mrkhub-plugin
pnpm install
pnpm build

# 2. 安装插件
openclaw plugins install git:github.com/MeerkatAIChina/openclaw-mrkhub-plugin

# 3. 重启 Gateway
openclaw gateway restart

# 4. 验证
openclaw plugins inspect mrkhub --runtime --json
```

在聊天中试用：

```
/mrkhub 产品市场调研
/mrkhub 安装 manufacturing_value_chain
```

安装成功后执行 `/new` 或 `openclaw gateway restart` 以加载新 skill。

## 安装方式

```bash
# 从 npm（推荐）
openclaw plugins install @meerkat-ai/openclaw-mrkhub-plugin

# 从 GitHub
openclaw plugins install git:github.com/MeerkatAIChina/openclaw-mrkhub-plugin
openclaw plugins install git:github.com/MeerkatAIChina/openclaw-mrkhub-plugin@main

# 本地开发
openclaw plugins install ./path/to/openclaw-mrkhub-plugin
openclaw plugins install ./path/to/openclaw-mrkhub-plugin --force

# 更新
openclaw plugins update mrkhub
```

聊天内安装（需 `commands.plugins: true`）：

```
/plugins install git:github.com/MeerkatAIChina/openclaw-mrkhub-plugin
```

## 配置

在 `openclaw.json` 中启用并配置插件：

```json5
{
  plugins: {
    entries: {
      mrkhub: {
        enabled: true,
        config: {
          repositories: [
            "MeerkatAIChina/manufacturing-ai-efficiency-Skill",
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

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `repositories` | `string[]` | 见下方默认仓库 | `owner/repo`、带 `@ref` 或 GitHub URL（含 `tree/<ref>/<path>`） |
| `installDir` | `string` | `~/.agents/skills` | skill 安装目录 |
| `defaultRef` | `string` | `main` | 未指定 ref 时使用的分支/标签 |
| `githubToken` | `string` | `GITHUB_TOKEN` 环境变量 | GitHub API 认证 |

默认索引仓库：

- [manufacturing-ai-efficiency-Skill](https://github.com/MeerkatAIChina/manufacturing-ai-efficiency-Skill/tree/ling/skills)（skills 根目录：`skills`；`owner/repo` 写法未带路径时默认同此）

## 使用示例

| 场景 | 输入 | 行为 |
|------|------|------|
| 帮助 | `/mrkhub` 或 `/mrkhub 帮助` | 显示用法 |
| 搜索 | `/mrkhub 市场调研` | 返回匹配的 skill 列表 |
| 安装 | `/mrkhub 安装 my_skill` | 安装指定 skill |
| 多轮 | 先搜索，再 `/mrkhub 那就安装第一个` | 根据上次结果安装 |

skill 命名规则：`a-z`、`0-9`、`_`，字母开头，最长 32 字符。

## OpenClaw 兼容性

| 项 | 值 |
|----|-----|
| 插件 ID | `mrkhub` |
| `pluginApi` | `>=2026.5.12` |
| `minGatewayVersion` | `2026.5.12` |
| 已测试版本 | OpenClaw `2026.5.12` |

## 与 ClawHub 的关系

- **插件本身**：通过 `git:github.com/...` 或本地路径安装，**不需要** ClawHub
- **业务 skills**：由 `/mrkhub` 从配置的 GitHub 仓库拉取，**不走** ClawHub skills 市场
- **ClawHub**：仅在你主动使用 `openclaw plugins install clawhub:...` 时才涉及

## 项目结构

```
src/
  index.ts           # 插件入口 definePluginEntry
  register.ts        # registerCommand / registerTool
  command/           # /mrkhub 处理
  config/            # 配置解析
  github/            # 仓库索引
  matcher/           # 搜索匹配
  installer/         # 安装落盘
  session/           # 多轮会话状态
test/unit/           # 单元测试
openclaw.plugin.json # 插件清单
```

## 开发与测试

```bash
pnpm install          # 安装依赖
pnpm verify           # typecheck + test + lint + build
pnpm smoke            # 端到端冒烟（GitHub 索引 / 搜索 / 安装）
pnpm install:local    # 构建并安装到 ~/.openclaw/extensions/mrkhub
```

### 本地联调（以 WSL 为例）

前提条件：本机 WSL 中已有一个正常运行的 OpenClaw。

1. 安装依赖并构建（建议将项目放到 WSL 中的目录）

   ```bash
   # 安装 pnpm（若未装）
   # npm install -g pnpm
   
   pnpm install
   
   # 类型检查 + 单测 + 构建
   pnpm verify
   
   # 或仅构建
   pnpm build
   ```

2. 将插件安装到 WSL 的 OpenClaw 中

   ```bash
   # 构建并复制到 ~/.openclaw/extensions/mrkhub，只装生产依赖
   pnpm install:local
   
   # 启用插件
   openclaw plugins enable mrkhub
   
   # 验证运行时是否 loaded
   openclaw plugins inspect mrkhub --runtime --json
   # 期望看到: "status": "loaded", "commands": ["mrkhub"]
   ```

   **备选1：openclaw plugins install 直接从 git 安装** 

   ```bash
   # 从 Github 安装
   openclaw plugins install git:github.com/MeerkatAIChina/openclaw-mrkhub-plugin@main
   
   openclaw plugins enable mrkhub
   ```

   **备选2：openclaw plugins install 链接本地源码** 

   改代码后需重启 Gateway

   ```bash
   # 从本地仓库链接
   openclaw plugins install --link ~/projects/meerkat-plugins
   
   openclaw plugins enable mrkhub
   ```

3. 在 OpenClaw 中配置插件（可选）

   ```bash
   # ~/.openclaw/openclaw.json 示例：
   {
     plugins: {
       entries: {
         mrkhub: {
           enabled: true,
           config: {
             repositories: ["MeerkatAIChina/manufacturing-ai-efficiency-Skill"],
             // githubToken: "ghp_xxx",  // 可选，防 GitHub 限流
           },
         },
       },
     },
     commands: {
       plugins: true,  // 若要在聊天里用 /plugins install
     },
   }
   ```

4. 重启 Gateway 使插件生效

   ```bash
   openclaw gateway restart
   
   # 再次确认运行时
   openclaw plugins inspect mrkhub --runtime --json
   ```

5. 不启 Gateway 的冒烟（可选）

   ```bash
   # 只测业务逻辑：help / 搜索 / 安装到 ~/.agents/skills
   pnpm smoke
   ```

6. 在聊天里测 `/mrkhub`

   Gateway 跑在 WSL 时，你的聊天客户端要连 WSL 这台 Gateway（不是 Windows 上另一套 openclaw）。

   ```bash
   /mrkhub 帮助
   /mrkhub 制造业 AI 提效
   /mrkhub 安装 manufacturing_ai_efficiency_pro
   ```

   安装 skill 后：

   ```bash
   /new
   # 或
   openclaw gateway restart
   ```

7. 改代码后的更新流程

   ```bash
   # 需要重新构建
   pnpm build
   pnpm install:local # 覆盖之前的 ~/.openclaw/extensions/mrkhub，也可以只用其他两种备选方式
   
   # 然后重启网关
   openclaw gateway restart
   openclaw plugins inspect mrkhub --runtime --json
   ```

## 故障排查

| 现象 | 可能原因 | 处理 |
|------|----------|------|
| `/mrkhub` 无响应 | 插件未安装或未启用 | `openclaw plugins list`，确认 `mrkhub` 已启用 |
| 安装后 skill 不可用 | 未刷新会话 | 执行 `/new` 或 `gateway restart` |
| GitHub API 403/429 | 限流或未授权 | 配置 `githubToken` |
| 找不到 skill | 仓库路径或名称不对 | 检查 `repositories` 与 skill 目录是否含 `SKILL.md` |
| `plugins install` 失败 | 未构建 | 先 `pnpm build` 再安装 |
| Agent 工具不可用 | 未加入 allowlist | 在 `tools.allow` 中加入工具名 |

安装排障可开启：

```bash
OPENCLAW_PLUGIN_LIFECYCLE_TRACE=1 openclaw plugins install ...
```

## 贡献

- 提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org/)：`feat(mrkhub): ...`、`fix(mrkhub): ...`
- 开发分支：`feature/*`、`fix/*`
- PR 前请通过：`pnpm typecheck && pnpm test && pnpm lint && pnpm build`

## 相关链接

- [OpenClaw Slash commands](https://documentation.openclaw.ai/tools/slash-commands)
- [Plugin SDK overview](https://documentation.openclaw.ai/plugins/sdk-overview)
- [Plugins CLI](https://docs.openclaw.ai/cli/plugins)
- [Building plugins](https://documentation.openclaw.ai/plugins/building-plugins)
- 方案调研：`docs/OpenClaw斜杠命令与mrkhub方案调研.md`

## License

MIT
