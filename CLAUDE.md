# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

这是一个 OpenClaw 插件，提供 `/mrkhub` 斜杠命令，用于从自有 GitHub 仓库搜索和安装 Meerkat skills（不依赖 ClawHub）。

## Common Commands

```bash
# 完整验证（类型检查 + 测试 + lint + 构建）
pnpm verify

# 单独构建（输出到 dist/）
pnpm build

# 运行单元测试
pnpm test

# 监听模式运行测试
pnpm test:watch

# 运行单个测试文件
pnpm vitest run test/unit/matcher.test.ts

# 端到端冒烟测试（测试 GitHub 索引/搜索/安装流程）
pnpm smoke

# 本地安装到 ~/.openclaw/extensions/mrkhub
pnpm install:local

# lint
pnpm lint

# 类型检查（不输出文件）
pnpm typecheck
```

## Architecture

### 插件入口与注册

- `src/index.ts`: 插件入口，使用 `definePluginEntry` 定义插件
- `src/register.ts`: 注册 `/mrkhub` 命令和两个可选工具 (`mrkhub_search`, `mrkhub_install`)

### 核心模块职责

- `src/command/mrkhub.ts`: 命令处理器，协调搜索、安装、多轮对话流程
- `src/intent/parse.ts`: 解析用户意图（help/search/install/指代性安装）
- `src/config/defaults.ts`: 配置解析，默认仓库 `MeerkatAIChina/manufacturing-ai-efficiency-Skill`，默认分支 `ling`
- `src/github/indexer.ts`: 从 GitHub 仓库索引 skills，支持 `skill-index.yaml` 或遍历目录
- `src/github/client.ts`: GitHub API 客户端
- `src/github/skill-index.ts`: `skill-index.yaml` 解析与 skill ID 规范化
- `src/matcher/search.ts`: 语义/关键词匹配算法（纯函数，便于单测）
- `src/installer/install.ts`: 下载 skill 到本地目录
- `src/installer/paths.ts`: 路径解析（`~/.agents/skills/`）
- `src/session/mrkhub-context.ts`: 多轮对话状态管理（基于 sessionKey 存储上次搜索结果）
- `src/tools/result.ts`: Agent 工具返回结果格式化

### 关键约束

- **SDK 导入规则** (来自 `.cursor/rules/openclaw-plugin.mdc`):
  - 入口使用 `definePluginEntry`（从 `openclaw/plugin-sdk/plugin-entry` 导入）
  - SDK 只从子路径导入，禁止 `openclaw/plugin-sdk` 根 barrel
  - 禁止通过 SDK 路径导入本插件自身
  - `openclaw.plugin.json` 中 `contracts.tools` 必须与 `registerTool` 名称一致
- **业务约束** (来自 `.cursor/rules/mrkhub-domain.mdc`):
  - `/mrkhub` 由 `registerCommand` handler 处理，安装逻辑走 `installer/`，不交给模型写路径
  - Skill 命名: `a-z0-9_`，字母开头，最长 32 字符
  - 默认安装目录: `~/.agents/skills/`
  - GitHub 索引与匹配保持纯函数，便于单测
- **会话状态**: 使用 Map 存储，key 为 `sessionKey ?? sessionId ?? "default"`

### 仓库索引策略

1. 优先读取 `skill-index.yaml`（如果存在）
2. 否则遍历 `skills/` 目录，读取每个子目录的 `SKILL.md` frontmatter

## OpenClaw 集成

- 插件 ID: `mrkhub`
- 兼容版本: `>=2026.5.12`
- 配置文件: `openclaw.plugin.json` 定义工具契约和配置 schema

## Testing

- 使用 Vitest，测试文件位于 `test/unit/*.test.ts`
- 核心逻辑（matcher、intent、skill-index）设计为纯函数，便于单元测试
- 冒烟测试需要 GitHub 访问，可能受 API 限流影响
