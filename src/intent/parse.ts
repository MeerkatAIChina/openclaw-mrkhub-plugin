import type { MrkhubIntent } from "./types.js";

const SKILL_NAME_MAX_LEN = 63;
const SKILL_NAME_RE = new RegExp(`^[a-z][a-z0-9_]{0,${SKILL_NAME_MAX_LEN}}$`);
const INSTALL_NAME_RE = new RegExp(`^[a-z][a-z0-9_-]{0,${SKILL_NAME_MAX_LEN}}$`);
const INSTALL_NAME_CAPTURE = `[a-z][a-z0-9_-]{1,${SKILL_NAME_MAX_LEN}}`;

const INSTALL_PATTERNS = [
  new RegExp(`(?:安装|install)\\s+[\`'"]?(${INSTALL_NAME_CAPTURE})[\`'"]?`, "i"),
  new RegExp(`(?:给我|帮我)?安装\\s+(${INSTALL_NAME_CAPTURE})`, "i"),
  new RegExp(`^(${INSTALL_NAME_CAPTURE})\\s*$`, "i"),
];

export function parseIntent(input: string): MrkhubIntent {
  const text = input.trim();
  if (!text || /^(help|\?|帮助)$/i.test(text)) {
    return { kind: "help" };
  }

  const lower = text.toLowerCase();
  if (
    /(?:第一|第二|第三|那个|这个|那就).*(?:安装|装)/.test(text) ||
    /(?:安装|装).*(?:第一|第二|第三|那个|这个)/.test(text)
  ) {
    return { kind: "install", skillName: "" };
  }

  if (
    lower.includes("安装") ||
    lower.startsWith("install ") ||
    /装\s+(?:这个|那个)?\s*skill/i.test(text)
  ) {
    for (const pattern of INSTALL_PATTERNS) {
      const match = text.match(pattern);
      if (match?.[1] && INSTALL_NAME_RE.test(match[1])) {
        return { kind: "install", skillName: match[1].toLowerCase() };
      }
    }
    const quoted = text.match(
      new RegExp(`[\`'"](${INSTALL_NAME_CAPTURE})[\`'"]`, "i"),
    );
    if (quoted?.[1] && INSTALL_NAME_RE.test(quoted[1])) {
      return { kind: "install", skillName: quoted[1].toLowerCase() };
    }
  }

  return { kind: "search", query: text };
}

export function isValidSkillName(name: string): boolean {
  return SKILL_NAME_RE.test(name);
}
