export type SkillIndexYamlEntry = {
  skill_id: string;
  name: string;
  path: string;
  category?: string;
  type?: string;
};

export function normalizeSkillId(skillId: string): string {
  return skillId
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/^_+/, "")
    .replace(/_+/g, "_");
}

export function parseSkillIndexYaml(raw: string): SkillIndexYamlEntry[] {
  const skills: SkillIndexYamlEntry[] = [];
  let current: Partial<SkillIndexYamlEntry> | null = null;

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    if (trimmed.startsWith("- skill_id:")) {
      if (current?.skill_id && current.name && current.path) {
        skills.push(current as SkillIndexYamlEntry);
      }
      current = { skill_id: trimmed.slice("- skill_id:".length).trim() };
      continue;
    }

    if (!current) {
      continue;
    }

    if (trimmed.startsWith("name:")) {
      current.name = trimmed.slice("name:".length).trim();
    } else if (trimmed.startsWith("path:")) {
      current.path = trimmed.slice("path:".length).trim().replace(/\/+$/, "");
    } else if (trimmed.startsWith("category:")) {
      current.category = trimmed.slice("category:".length).trim();
    } else if (trimmed.startsWith("type:")) {
      current.type = trimmed.slice("type:".length).trim();
    }
  }

  if (current?.skill_id && current.name && current.path) {
    skills.push(current as SkillIndexYamlEntry);
  }

  return skills;
}
