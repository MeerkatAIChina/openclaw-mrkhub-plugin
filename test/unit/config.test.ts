import { describe, expect, it } from "vitest";
import {
  DEFAULT_OSS_BASE_URL,
  resolveConfig,
} from "../../src/config/defaults.js";

describe("resolveConfig", () => {
  it("uses default OSS base URL when empty", () => {
    const cfg = resolveConfig(undefined);
    expect(cfg.ossBaseUrl).toBe(DEFAULT_OSS_BASE_URL);
    expect(cfg.installDir).toBeUndefined();
  });

  it("uses custom OSS base URL when provided", () => {
    const cfg = resolveConfig({ ossBaseUrl: "https://custom.oss.com" });
    expect(cfg.ossBaseUrl).toBe("https://custom.oss.com");
  });

  it("uses custom installDir when provided", () => {
    const cfg = resolveConfig({ installDir: "/custom/path" });
    expect(cfg.installDir).toBe("/custom/path");
    expect(cfg.ossBaseUrl).toBe(DEFAULT_OSS_BASE_URL);
  });
});
