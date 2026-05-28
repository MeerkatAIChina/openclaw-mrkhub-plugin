import { describe, expect, it } from "vitest";
import {
  normalizeSkillId,
  parseSkillIndexYaml,
} from "../../src/storage/skill-index.js";

const SAMPLE = `
registry: manufacturing-ai-efficiency-Skill
skills:
- skill_id: fast-moving-consumer-goods-supply-chain
  name: 快消品供应链优化
  category: ecommerce
  type: workflow
  path: skills/commercial/fast-moving-consumer-goods-supply-chain/
  files:
    - README.md
    - SKILL.md
    - references/guide.pdf
- skill_id: manufacturing-ai-efficiency-pro
  name: 制造业 AI 提效分析
  category: manufacturing
  type: hybrid
  path: skills/manufacturing/manufacturing-ai-efficiency-pro/
`;

describe("parseSkillIndexYaml", () => {
  it("parses skill entries", () => {
    const items = parseSkillIndexYaml(SAMPLE);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      skill_id: "fast-moving-consumer-goods-supply-chain",
      name: "快消品供应链优化",
      path: "skills/commercial/fast-moving-consumer-goods-supply-chain",
      category: "ecommerce",
    });
  });

  it("parses files list", () => {
    const items = parseSkillIndexYaml(SAMPLE);
    expect(items[0]?.files).toEqual([
      "README.md",
      "SKILL.md",
      "references/guide.pdf",
    ]);
  });

  it("handles skill without files", () => {
    const items = parseSkillIndexYaml(SAMPLE);
    expect(items[1]?.files).toBeUndefined();
  });
});

describe("normalizeSkillId", () => {
  it("converts hyphens to underscores", () => {
    expect(normalizeSkillId("fast-moving-consumer-goods-supply-chain")).toBe(
      "fast_moving_consumer_goods_supply_chain",
    );
  });
});
