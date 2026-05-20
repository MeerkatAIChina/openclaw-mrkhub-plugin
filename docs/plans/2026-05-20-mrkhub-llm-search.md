# mrkhub LLM 语义搜索 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 mrkhub 搜索链路中接入可选 LLM 重排，使自然语言描述（如「产品市场调研」）能匹配到语义相关的 skill，同时保留关键词召回作为默认/fast path 与 fallback。

**Architecture:** 保持现有 GitHub 索引（`loadSkillIndex`）不变。搜索分两阶段：① `searchSkills` 关键词召回 top-N 候选；② 若 `useLlmSearch=true` 且 runtime 可用，调用 `api.runtime.llm.complete` 让模型按用户 query 对候选重排并返回 top-5。LLM 失败或未授权时自动回退关键词结果。`/mrkhub` 与 `mrkhub_search` 共用同一搜索函数。

**Tech Stack:** TypeScript, OpenClaw Plugin SDK (`api.runtime.llm.complete`), vitest, 现有 `matcher/search.ts` / `config/defaults.ts`

---

## 背景与约束

| 项 | 说明 |
|----|------|
| 现状 | `searchSkills` 仅做 token 子串打分，无语义理解 |
| OpenClaw LLM API | 插件内通过 `api.runtime.llm.complete` 调用；需用户在 `plugins.entries.mrkhub.llm` 授权 |
| 设计原则 | 默认关闭 LLM（`useLlmSearch: false`），不改变现有确定性行为 |
| 不在范围 | LLM 意图解析（`parseIntent`）、向量/embeddings、索引缓存 |

## 文件变更一览

| 文件 | 操作 | 职责 |
|------|------|------|
| `src/config/types.ts` | Modify | 扩展 `MrkhubConfig` |
| `src/config/defaults.ts` | Modify | 新配置默认值与 resolve |
| `openclaw.plugin.json` | Modify | configSchema 新字段 |
| `src/matcher/llm-rerank.ts` | Create | LLM prompt 构建、调用、结果解析 |
| `src/matcher/search.ts` | Modify | 导出 recall limit；保持纯函数 |
| `src/matcher/search-with-llm.ts` | Create | 编排 recall + rerank + fallback |
| `src/command/mrkhub.ts` | Modify | 搜索路径改用 orchestrator |
| `src/register.ts` | Modify | 注入 `api` 到搜索 orchestrator |
| `test/unit/llm-rerank.test.ts` | Create | prompt 解析单测 |
| `test/unit/search-with-llm.test.ts` | Create | fallback / 编排单测 |
| `test/unit/config.test.ts` | Modify | 新配置字段 |
| `README.md` | Modify | 配置说明（可选 LLM 搜索） |

---

## 配置设计

```typescript
// src/config/types.ts 新增字段
export type MrkhubConfig = {
  repositories: string[];
  installDir?: string;
  githubToken?: string;
  defaultRef: string;
  useLlmSearch?: boolean;      // 默认 false
  llmRecallLimit?: number;     // 关键词召回数，默认 20
  llmSearchLimit?: number;     // 最终返回数，默认 5
};
```

用户 OpenClaw 配置示例：

```json5
{
  plugins: {
    entries: {
      mrkhub: {
        enabled: true,
        llm: {
          allowModelOverride: true,
          allowedModels: ["openai/gpt-4o-mini"]
        },
        config: {
          useLlmSearch: true,
          llmRecallLimit: 20
        }
      }
    }
  }
}
```

---

## LLM 交互协议

**输入 prompt（system + user）：**

```
System: 你是 skill 检索助手。根据用户描述，从候选列表中选出最相关的 skill。
只输出 JSON 数组，元素为 skill 的 name 字符串，按相关度降序。不要输出其它文字。

User:
用户描述：{query}

候选 skills：
1. name: market_research, description: 产品市场调研与分析
2. name: manufacturing_value_chain, description: 制造业价值链优化
...
```

**期望输出：**

```json
["market_research", "manufacturing_value_chain"]
```

**解析规则：**

- 从响应中提取 JSON 数组（允许 markdown code fence 包裹）
- 只保留存在于候选集中的 name
- 候选集中未被 LLM 提及的条目，按原关键词 score 追加到末尾
- 解析失败或 `complete` 抛错 → 返回关键词 `searchSkills` 结果

---

### Task 1: 配置层扩展

**Files:**
- Modify: `src/config/types.ts`
- Modify: `src/config/defaults.ts`
- Modify: `openclaw.plugin.json`
- Test: `test/unit/config.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// test/unit/config.test.ts 追加
it("resolves llm search defaults", () => {
  const cfg = resolveConfig({ useLlmSearch: true, llmRecallLimit: 15 });
  expect(cfg.useLlmSearch).toBe(true);
  expect(cfg.llmRecallLimit).toBe(15);
  expect(cfg.llmSearchLimit).toBe(5);
});

it("defaults useLlmSearch to false", () => {
  const cfg = resolveConfig(undefined);
  expect(cfg.useLlmSearch).toBe(false);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test test/unit/config.test.ts`
Expected: FAIL — 属性不存在

- [ ] **Step 3: 实现配置**

```typescript
// src/config/types.ts
export type MrkhubConfig = {
  repositories: string[];
  installDir?: string;
  githubToken?: string;
  defaultRef: string;
  useLlmSearch: boolean;
  llmRecallLimit: number;
  llmSearchLimit: number;
};

// src/config/defaults.ts resolveConfig 追加
useLlmSearch: raw.useLlmSearch === true,
llmRecallLimit:
  typeof raw.llmRecallLimit === "number" && raw.llmRecallLimit > 0
    ? raw.llmRecallLimit
    : 20,
llmSearchLimit:
  typeof raw.llmSearchLimit === "number" && raw.llmSearchLimit > 0
    ? raw.llmSearchLimit
    : 5,
```

```json
// openclaw.plugin.json configSchema.properties 追加
"useLlmSearch": {
  "type": "boolean",
  "description": "Use LLM to rerank search results (default false)"
},
"llmRecallLimit": {
  "type": "number",
  "description": "Keyword recall count before LLM rerank (default 20)"
},
"llmSearchLimit": {
  "type": "number",
  "description": "Final result count (default 5)"
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm test test/unit/config.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/config/types.ts src/config/defaults.ts openclaw.plugin.json test/unit/config.test.ts
git commit -m "feat(config): add llm search options for mrkhub"
```

---

### Task 2: LLM 重排模块（纯函数 + 可注入 complete）

**Files:**
- Create: `src/matcher/llm-rerank.ts`
- Test: `test/unit/llm-rerank.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// test/unit/llm-rerank.test.ts
import { describe, expect, it } from "vitest";
import {
  buildRerankPrompt,
  parseRerankResponse,
  applyRerankOrder,
} from "../../src/matcher/llm-rerank.js";
import type { SearchHit } from "../../src/matcher/search.js";

const hits: SearchHit[] = [
  { name: "market_research", description: "市场调研", path: "a", repo: {} as any, score: 2 },
  { name: "mfg_chain", description: "制造链", path: "b", repo: {} as any, score: 1 },
];

describe("llm-rerank", () => {
  it("builds prompt with query and candidates", () => {
    const prompt = buildRerankPrompt("市场调研", hits);
    expect(prompt).toContain("市场调研");
    expect(prompt).toContain("market_research");
  });

  it("parses json array from llm response", () => {
    const names = parseRerankResponse('```json\n["mfg_chain","market_research"]\n```');
    expect(names).toEqual(["mfg_chain", "market_research"]);
  });

  it("reorders hits by llm names and appends rest", () => {
    const ordered = applyRerankOrder(hits, ["mfg_chain"]);
    expect(ordered[0]?.name).toBe("mfg_chain");
    expect(ordered[1]?.name).toBe("market_research");
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test test/unit/llm-rerank.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: 实现 llm-rerank.ts**

```typescript
// src/matcher/llm-rerank.ts
import type { SearchHit } from "./search.js";

export function buildRerankPrompt(query: string, hits: SearchHit[]): string {
  const lines = hits.map(
    (h, i) => `${i + 1}. name: ${h.name}, description: ${h.description}`,
  );
  return [
    "用户描述：" + query,
    "",
    "候选 skills：",
    ...lines,
  ].join("\n");
}

export function parseRerankResponse(raw: string): string[] {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const text = (fenced?.[1] ?? raw).trim();
  const parsed = JSON.parse(text) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("LLM rerank response is not an array");
  }
  return parsed.filter((x): x is string => typeof x === "string");
}

export function applyRerankOrder(
  hits: SearchHit[],
  orderedNames: string[],
): SearchHit[] {
  const byName = new Map(hits.map((h) => [h.name, h]));
  const seen = new Set<string>();
  const result: SearchHit[] = [];
  for (const name of orderedNames) {
    const hit = byName.get(name);
    if (hit && !seen.has(name)) {
      result.push(hit);
      seen.add(name);
    }
  }
  for (const hit of hits) {
    if (!seen.has(hit.name)) {
      result.push(hit);
    }
  }
  return result;
}

export type LlmCompleteFn = (input: {
  messages: Array<{ role: "system" | "user"; content: string }>;
}) => Promise<{ content: string }>;

const SYSTEM_PROMPT =
  "你是 skill 检索助手。根据用户描述，从候选列表中选出最相关的 skill。" +
  "只输出 JSON 数组，元素为 skill 的 name 字符串，按相关度降序。不要输出其它文字。";

export async function rerankWithLlm(
  query: string,
  hits: SearchHit[],
  complete: LlmCompleteFn,
): Promise<SearchHit[]> {
  if (hits.length === 0) {
    return [];
  }
  const res = await complete({
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildRerankPrompt(query, hits) },
    ],
  });
  const names = parseRerankResponse(res.content);
  return applyRerankOrder(hits, names);
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm test test/unit/llm-rerank.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/matcher/llm-rerank.ts test/unit/llm-rerank.test.ts
git commit -m "feat(matcher): add llm rerank helpers for skill search"
```

---

### Task 3: 搜索编排层

**Files:**
- Create: `src/matcher/search-with-llm.ts`
- Modify: `src/matcher/search.ts`（可选：导出 `DEFAULT_SEARCH_LIMIT` 常量，无行为变更）
- Test: `test/unit/search-with-llm.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// test/unit/search-with-llm.test.ts
import { describe, expect, it, vi } from "vitest";
import { searchSkillsWithOptionalLlm } from "../../src/matcher/search-with-llm.js";
import type { SkillIndexEntry } from "../../src/github/indexer.js";
import type { MrkhubConfig } from "../../src/config/types.js";

const entries: SkillIndexEntry[] = [
  {
    name: "market_research",
    description: "产品市场调研",
    path: "skills/market_research",
    repo: { owner: "o", repo: "r", ref: "main", skillsPath: "skills" },
  },
];

const baseConfig: MrkhubConfig = {
  repositories: [],
  defaultRef: "main",
  useLlmSearch: false,
  llmRecallLimit: 20,
  llmSearchLimit: 5,
};

describe("searchSkillsWithOptionalLlm", () => {
  it("uses keyword search when llm disabled", async () => {
    const hits = await searchSkillsWithOptionalLlm(
      entries,
      "市场调研",
      baseConfig,
      undefined,
    );
    expect(hits[0]?.name).toBe("market_research");
  });

  it("falls back to keyword when llm throws", async () => {
    const hits = await searchSkillsWithOptionalLlm(
      entries,
      "市场调研",
      { ...baseConfig, useLlmSearch: true },
      async () => {
        throw new Error("llm down");
      },
    );
    expect(hits[0]?.name).toBe("market_research");
  });

  it("uses llm order when enabled", async () => {
    const hits = await searchSkillsWithOptionalLlm(
      entries,
      "调研",
      { ...baseConfig, useLlmSearch: true },
      async () => ({ content: '["market_research"]' }),
    );
    expect(hits[0]?.name).toBe("market_research");
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test test/unit/search-with-llm.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现 search-with-llm.ts**

```typescript
// src/matcher/search-with-llm.ts
import type { MrkhubConfig } from "../config/types.js";
import type { SkillIndexEntry } from "../github/indexer.js";
import { rerankWithLlm, type LlmCompleteFn } from "./llm-rerank.js";
import { searchSkills, type SearchHit } from "./search.js";

export async function searchSkillsWithOptionalLlm(
  entries: SkillIndexEntry[],
  query: string,
  config: MrkhubConfig,
  complete: LlmCompleteFn | undefined,
): Promise<SearchHit[]> {
  const recall = searchSkills(entries, query, config.llmRecallLimit);

  if (!config.useLlmSearch || !complete || recall.length === 0) {
    return recall.slice(0, config.llmSearchLimit);
  }

  try {
    const reranked = await rerankWithLlm(query, recall, complete);
    return reranked.slice(0, config.llmSearchLimit);
  } catch {
    return recall.slice(0, config.llmSearchLimit);
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm test test/unit/search-with-llm.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/matcher/search-with-llm.ts test/unit/search-with-llm.test.ts
git commit -m "feat(matcher): orchestrate keyword recall with optional llm rerank"
```

---

### Task 4: 接入 register 与 /mrkhub

**Files:**
- Modify: `src/register.ts`
- Modify: `src/command/mrkhub.ts`

- [ ] **Step 1: 在 register.ts 创建 llm complete 适配器**

实现时先查阅 OpenClaw SDK 中 `api.runtime.llm.complete` 的实际签名（`openclaw/plugin-sdk/plugin-entry` 类型定义），封装为 `LlmCompleteFn`：

```typescript
// src/register.ts 内 helper
function createLlmComplete(api: OpenClawPluginApi): LlmCompleteFn | undefined {
  const llm = api.runtime?.llm;
  if (!llm?.complete) {
    return undefined;
  }
  return async (input) => {
    const res = await llm.complete(input);
    return { content: typeof res.content === "string" ? res.content : String(res.content ?? "") };
  };
}
```

- [ ] **Step 2: mrkhub_search tool 改用 orchestrator**

```typescript
// register.ts mrkhub_search execute 内
const index = await loadSkillIndex(config());
const hits = await searchSkillsWithOptionalLlm(
  index,
  query,
  config(),
  createLlmComplete(api),
);
```

- [ ] **Step 3: handleMrkhubCommand 支持 LLM**

扩展 `MrkhubCommandDeps`：

```typescript
export type MrkhubCommandDeps = {
  getConfig: () => MrkhubConfig;
  getSessionState: () => MrkhubSessionState;
  setSessionState: (state: MrkhubSessionState) => void;
  llmComplete?: LlmCompleteFn;
};
```

搜索分支：

```typescript
const hits = await searchSkillsWithOptionalLlm(
  index,
  intent.query,
  config,
  deps.llmComplete,
);
```

`createMrkhubDeps` 增加可选参数 `llmComplete`；`registerCommand` handler 传入 `createLlmComplete(api)`。

- [ ] **Step 4: 运行全量测试**

Run: `pnpm verify`
Expected: typecheck + test + lint + build 全通过

- [ ] **Step 5: Commit**

```bash
git add src/register.ts src/command/mrkhub.ts
git commit -m "feat(mrkhub): wire optional llm rerank into search command and tool"
```

---

### Task 5: 文档与 smoke 验证

**Files:**
- Modify: `README.md`

- [ ] **Step 1: README 追加 LLM 搜索配置说明**

包含：
- `useLlmSearch` 默认 false
- 需配置 `plugins.entries.mrkhub.llm.allowModelOverride` 与 `allowedModels`
- LLM 失败时自动回退关键词

- [ ] **Step 2: 本地 smoke**

Run: `pnpm run smoke`
Expected: PASS

- [ ] **Step 3: 手动验证清单**

1. `useLlmSearch: false` — `/mrkhub 市场调研` 行为与改前一致
2. `useLlmSearch: true` + llm 授权 — 自然语言 query 排序更合理
3. 断开 llm / 未授权 — 仍返回关键词结果，不抛错给用户

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs(mrkhub): document optional llm search configuration"
```

---

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| `api.runtime.llm.complete` 签名与文档不一致 | Task 4 第一步先读 SDK 类型再写 adapter |
| LLM 返回非法 JSON | `parseRerankResponse` 抛错 → orchestrator catch → fallback |
| 关键词 recall 为空 | 跳过 LLM，直接返回 `[]` |
| 延迟增加 | 默认关闭；recall limit 可配；建议用小模型 |
| 费用 | 仅对 recall 候选发 prompt，不全量索引 |

## 验收标准

- [ ] `useLlmSearch: false` 时零行为回归
- [ ] `useLlmSearch: true` 且 LLM 可用时，语义相关 query 排序优于纯关键词（手动 case：`市场调研` → `market_research`）
- [ ] LLM 不可用时不报错，fallback 关键词结果
- [ ] `/mrkhub` 与 `mrkhub_search` 共用同一 orchestrator
- [ ] `pnpm verify` 通过

---

## Spec 覆盖自检

| 需求 | 对应 Task |
|------|-----------|
| 可选 LLM 语义匹配 | Task 2–4 |
| 默认保持确定性关键词 | Task 1, 3 (`useLlmSearch: false`) |
| fallback | Task 3 |
| 配置化 | Task 1 |
| 两条搜索入口统一 | Task 4 |
| 用户 llm 权限说明 | Task 5 |
