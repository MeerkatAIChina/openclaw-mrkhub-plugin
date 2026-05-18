import type { MrkhubIntent } from "./types.js";

const SKILL_NAME_RE = /^[a-z][a-z0-9_]{0,31}$/;

const INSTALL_PATTERNS = [
  /(?:安装|install)\s+[`'"]?([a-z][a-z0-9_]{0,31})[`'"]?/i,
  /(?:给我|帮我)?安装\s+([a-z][a-z0-9_]{0,31})/i,
  /^([a-z][a-z0-9_]{0,31})\s*$/i,
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
      if (match?.[1] && SKILL_NAME_RE.test(match[1])) {
        return { kind: "install", skillName: match[1].toLowerCase() };
      }
    }
    const quoted = text.match(/[`'"]([a-z][a-z0-9_]{0,31})[`'"]/i);
    if (quoted?.[1]) {
      return { kind: "install", skillName: quoted[1].toLowerCase() };
    }
  }

  return { kind: "search", query: text };
}

export function isValidSkillName(name: string): boolean {
  return SKILL_NAME_RE.test(name);
}
