import type { MrkhubConfig } from '../config/types.js';
import { fetchText, getSkillIndexUrl } from '../oss/client.js';
import { normalizeSkillId, parseSkillIndexYaml, type SkillIndexYamlEntry } from './skill-index.js';

export type SkillIndexEntry = {
    name: string;
    description: string;
    path: string;
    baseUrl: string;
    tags?: string[];
    files?: string[];
};

function entryFromSkillIndexItem(
    item: SkillIndexYamlEntry,
    baseUrl: string
): SkillIndexEntry | undefined {
    const name = normalizeSkillId(item.skill_id);
    if (!name) {
        return undefined;
    }
    const tags = [item.category, item.type].filter(
        (t): t is string => typeof t === 'string' && t.length > 0
    );
    return {
        name,
        description: item.name,
        path: item.path,
        baseUrl,
        tags: tags.length > 0 ? tags : undefined,
        files: item.files,
    };
}

export async function loadSkillIndex(config: MrkhubConfig): Promise<SkillIndexEntry[]> {
    const url = getSkillIndexUrl(config.ossBaseUrl);
    const raw = await fetchText(url);
    const items = parseSkillIndexYaml(raw);
    return items
        .map(item => entryFromSkillIndexItem(item, config.ossBaseUrl))
        .filter((entry): entry is SkillIndexEntry => entry !== undefined);
}

export async function findSkillByName(
    config: MrkhubConfig,
    skillName: string
): Promise<SkillIndexEntry | undefined> {
    const index = await loadSkillIndex(config);
    const normalized = normalizeSkillId(skillName);
    return index.find(e => e.name === normalized);
}
