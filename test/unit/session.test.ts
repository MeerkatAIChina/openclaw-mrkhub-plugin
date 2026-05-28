import { describe, expect, it } from "vitest";
import { resolveInstallNameFromSession } from "../../src/session/mrkhub-context.js";

describe("resolveInstallNameFromSession", () => {
  const state = {
    lastResults: [{ name: "ppt_master", description: "PPT", path: "skills/content/ppt-master", score: 10, baseUrl: "https://meerkatai-skills.oss-cn-shanghai.aliyuncs.com" }],
    updatedAt: Date.now(),
  };

  it("resolves bare 安装 to first search result", () => {
    expect(resolveInstallNameFromSession(state, "安装")).toBe("ppt_master");
    expect(resolveInstallNameFromSession(state, "install")).toBe("ppt_master");
  });

  it("returns undefined for bare 安装 without session results", () => {
    expect(resolveInstallNameFromSession({ lastResults: [], updatedAt: 0 }, "安装")).toBeUndefined();
  });
});
