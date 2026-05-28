import type { SkillIndexEntry } from "../storage/indexer.js";

export type SearchHit = SkillIndexEntry & { score: number };

const QUERY_FILLER_RE =
  /(?:帮我|给我|请|找|搜索|查询|有没有|哪些|什么|一下|相关的?|skills?|skill)/gi;

function cleanQuery(query: string): string {
  return query.replace(QUERY_FILLER_RE, " ").replace(/\s+/g, " ").trim();
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s,，。、；;:!?]+/)
    .filter((t) => t.length > 1);
}

export function searchSkills(
  entries: SkillIndexEntry[],
  query: string,
  limit = 5,
): SearchHit[] {
  const cleaned = cleanQuery(query);
  const tokens = tokenize(cleaned || query);
  if (tokens.length === 0 && cleaned.length < 2) {
    return [];
  }

  const scored: SearchHit[] = [];
  for (const entry of entries) {
    const haystack = [
      entry.name,
      entry.description,
      entry.path,
      ...(entry.tags ?? []),
    ]
      .join(" ")
      .toLowerCase();

    let score = 0;
    const phrase = (cleaned || query).toLowerCase();
    if (phrase.length >= 2 && haystack.includes(phrase)) {
      score += 15;
    }
    if (phrase.length >= 2 && entry.description.toLowerCase().includes(phrase)) {
      score += 10;
    }
    for (const token of tokens) {
      if (entry.name.includes(token)) {
        score += 10;
      }
      if (haystack.includes(token)) {
        score += 2;
      }
    }
    if (score > 0) {
      scored.push({ ...entry, score });
    }
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}
