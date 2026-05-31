import { describe, expect, it } from "vitest";
import {
  normalizeSkillId,
  parseSkillPositionsYaml,
} from "../../src/storage/skill-positions.js";

const SAMPLE = `
updated_at: '2026-05-31'
total_skills: 27
skills:
- skill_id: fast-moving-consumer-goods-supply-chain
  name: 快消品供应链优化
  description: 快消品供应链管理与优化。从采购到配送，识别供应链瓶颈。
  path: skills/commercial/fast-moving-consumer-goods-supply-chain/
  files:
    - README.md
    - SKILL.md
    - references/guide.pdf
- skill_id: manufacturing-ai-efficiency-pro
  name: 制造业 AI 提效分析
  description: 制造业流程拆解与AI提效扫描。
  path: skills/manufacturing/manufacturing-ai-efficiency-pro/
`;

describe("parseSkillPositionsYaml", () => {
  it("parses skill entries from skills: list", () => {
    const items = parseSkillPositionsYaml(SAMPLE);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      skill_id: "fast-moving-consumer-goods-supply-chain",
      name: "快消品供应链优化",
      description: "快消品供应链管理与优化。从采购到配送，识别供应链瓶颈。",
      path: "skills/commercial/fast-moving-consumer-goods-supply-chain",
    });
  });

  it("parses files list", () => {
    const items = parseSkillPositionsYaml(SAMPLE);
    expect(items[0]?.files).toEqual([
      "README.md",
      "SKILL.md",
      "references/guide.pdf",
    ]);
  });

  it("handles skill without files", () => {
    const items = parseSkillPositionsYaml(SAMPLE);
    expect(items[1]?.files).toBeUndefined();
  });

  it("ignores top-level fields outside skills list", () => {
    const items = parseSkillPositionsYaml(SAMPLE);
    // updated_at and total_skills should not be parsed as skills
    expect(items).toHaveLength(2);
  });
});

describe("normalizeSkillId", () => {
  it("converts hyphens to underscores", () => {
    expect(normalizeSkillId("fast-moving-consumer-goods-supply-chain")).toBe(
      "fast_moving_consumer_goods_supply_chain",
    );
  });
});
