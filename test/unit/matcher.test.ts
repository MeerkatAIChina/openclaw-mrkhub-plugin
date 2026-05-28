import { describe, expect, it } from "vitest";
import { searchSkills } from "../../src/matcher/search.js";
import type { SkillIndexEntry } from "../../src/storage/indexer.js";

const entries: SkillIndexEntry[] = [
  {
    name: "market_research",
    description: "产品市场调研与分析",
    path: "skills/market_research",
    baseUrl: "https://meerkatai-skills.oss-cn-shanghai.aliyuncs.com",
  },
  {
    name: "manufacturing_value_chain",
    description: "制造业价值链优化",
    path: "skills/mfg",
    baseUrl: "https://meerkatai-skills.oss-cn-shanghai.aliyuncs.com",
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

  it("matches Chinese phrase after filler removal", () => {
    const hits = searchSkills(
      [
        {
          name: "fast_moving_consumer_goods_supply_chain",
          description: "快消品供应链优化",
          path: "skills/commercial/fast-moving-consumer-goods-supply-chain",
          baseUrl: "https://meerkatai-skills.oss-cn-shanghai.aliyuncs.com",
        },
      ],
      "帮我找快消品供应链优化相关的 skills",
    );
    expect(hits[0]?.name).toBe("fast_moving_consumer_goods_supply_chain");
  });
});
