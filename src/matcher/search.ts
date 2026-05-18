import type { SkillIndexEntry } from "../github/indexer.js";

export type SearchHit = SkillIndexEntry & { score: number };

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
  const tokens = tokenize(query);
  if (tokens.length === 0) {
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
