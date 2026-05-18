import { describe, expect, it } from "vitest";
import { parseIntent, isValidSkillName } from "../../src/intent/parse.js";

describe("parseIntent", () => {
  it("returns help for empty input", () => {
    expect(parseIntent("")).toEqual({ kind: "help" });
    expect(parseIntent("帮助")).toEqual({ kind: "help" });
  });

  it("parses search query", () => {
    expect(parseIntent("产品市场调研")).toEqual({
      kind: "search",
      query: "产品市场调研",
    });
  });

  it("parses explicit install", () => {
    expect(parseIntent("安装 manufacturing_value_chain")).toEqual({
      kind: "install",
      skillName: "manufacturing_value_chain",
    });
  });

  it("parses follow-up install without name", () => {
    expect(parseIntent("那就安装第一个")).toEqual({
      kind: "install",
      skillName: "",
    });
  });
});

describe("isValidSkillName", () => {
  it("accepts valid names", () => {
    expect(isValidSkillName("manufacturing_value_chain")).toBe(true);
  });

  it("rejects invalid names", () => {
    expect(isValidSkillName("Bad-Name")).toBe(false);
    expect(isValidSkillName("")).toBe(false);
  });
});
