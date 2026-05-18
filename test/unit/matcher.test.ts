import { describe, expect, it } from "vitest";
import { searchSkills } from "../../src/matcher/search.js";
import type { SkillIndexEntry } from "../../src/github/indexer.js";

const entries: SkillIndexEntry[] = [
  {
    name: "market_research",
    description: "产品市场调研与分析",
    path: "skills/market_research",
    repo: {
      owner: "MeerkatAIChina",
      repo: "demo",
      ref: "main",
      skillsPath: "skills",
    },
  },
  {
    name: "manufacturing_value_chain",
    description: "制造业价值链优化",
    path: "skills/mfg",
    repo: {
      owner: "MeerkatAIChina",
      repo: "demo",
      ref: "main",
      skillsPath: "skills",
    },
  },
];

describe("searchSkills", () => {
  it("ranks by relevance", () => {
    const hits = searchSkills(entries, "市场调研");
    expect(hits[0]?.name).toBe("market_research");
  });

  it("returns empty for no match", () => {
    expect(searchSkills(entries, "xyznone")).toEqual([]);
  });
});
