import { describe, expect, it } from "vitest";
import {
  parseRepositorySpec,
  resolveConfig,
} from "../../src/config/defaults.js";

describe("resolveConfig", () => {
  it("uses defaults when empty", () => {
    const cfg = resolveConfig(undefined);
    expect(cfg.repositories.length).toBeGreaterThan(0);
    expect(cfg.defaultRef).toBe("main");
  });
});

describe("parseRepositorySpec", () => {
  it("parses owner/repo", () => {
    const r = parseRepositorySpec("MeerkatAIChina/foo", "main");
    expect(r.owner).toBe("MeerkatAIChina");
    expect(r.repo).toBe("foo");
    expect(r.ref).toBe("main");
  });

  it("parses github URL with tree path", () => {
    const r = parseRepositorySpec(
      "https://github.com/MeerkatAIChina/foo/tree/main/skills",
      "main",
    );
    expect(r.owner).toBe("MeerkatAIChina");
    expect(r.repo).toBe("foo");
    expect(r.skillsPath).toBe("skills");
    expect(r.ref).toBe("main");
  });
});
