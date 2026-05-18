import { describe, expect, it } from "vitest";
import {
  assertValidSkillName,
  skillInstallPath,
} from "../../src/installer/paths.js";

describe("skill paths", () => {
  it("validates skill names", () => {
    expect(() => assertValidSkillName("ok_skill")).not.toThrow();
    expect(() => assertValidSkillName("../evil")).toThrow();
  });

  it("resolves install path under root", () => {
    const p = skillInstallPath("/tmp/agents/skills", "demo_skill");
    expect(p).toContain("demo_skill");
  });
});
