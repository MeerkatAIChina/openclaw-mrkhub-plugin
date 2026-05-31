import { describe, expect, it } from "vitest";
import {
  getSkillFileUrl,
  getSkillPositionsUrl,
} from "../../src/oss/client.js";

describe("getSkillPositionsUrl", () => {
  it("builds skill-positions.yaml URL", () => {
    const url = getSkillPositionsUrl("https://meerkatai-skills.oss-cn-shanghai.aliyuncs.com");
    expect(url).toBe("https://meerkatai-skills.oss-cn-shanghai.aliyuncs.com/skill-positions.yaml");
  });

  it("handles trailing slash in base URL", () => {
    const url = getSkillPositionsUrl("https://meerkatai-skills.oss-cn-shanghai.aliyuncs.com/");
    expect(url).toBe("https://meerkatai-skills.oss-cn-shanghai.aliyuncs.com/skill-positions.yaml");
  });
});

describe("getSkillFileUrl", () => {
  it("builds skill file URL", () => {
    const url = getSkillFileUrl(
      "https://meerkatai-skills.oss-cn-shanghai.aliyuncs.com",
      "skills/commercial/fast-moving-consumer-goods-supply-chain",
      "SKILL.md"
    );
    expect(url).toBe(
      "https://meerkatai-skills.oss-cn-shanghai.aliyuncs.com/skills/commercial/fast-moving-consumer-goods-supply-chain/SKILL.md"
    );
  });

  it("handles trailing slash in path", () => {
    const url = getSkillFileUrl(
      "https://meerkatai-skills.oss-cn-shanghai.aliyuncs.com",
      "skills/foo/",
      "SKILL.md"
    );
    expect(url).toBe(
      "https://meerkatai-skills.oss-cn-shanghai.aliyuncs.com/skills/foo/SKILL.md"
    );
  });

  it("handles leading slash in path", () => {
    const url = getSkillFileUrl(
      "https://meerkatai-skills.oss-cn-shanghai.aliyuncs.com",
      "/skills/foo",
      "SKILL.md"
    );
    expect(url).toBe(
      "https://meerkatai-skills.oss-cn-shanghai.aliyuncs.com/skills/foo/SKILL.md"
    );
  });
});
