import type { MrkhubConfig } from '../config/types.js';
import { fetchText, getSkillPositionsUrl } from '../oss/client.js';
import { normalizeSkillId, parseSkillPositionsYaml, type SkillPositionYamlEntry } from './skill-positions.js';

export type SkillPositionEntry = {
    name: string;
    description: string;
    path: string;
    baseUrl: string;
    files?: string[];
};

function entryFromPositionItem(
    item: SkillPositionYamlEntry,
    baseUrl: string
): SkillPositionEntry | undefined {
    const name = normalizeSkillId(item.skill_id);
    if (!name) {
        return undefined;
    }
    return {
        name,
        description: item.description ?? item.name,
        path: item.path,
        baseUrl,
        files: item.files,
    };
}

export async function loadSkillPositions(config: MrkhubConfig): Promise<SkillPositionEntry[]> {
    const url = getSkillPositionsUrl(config.ossBaseUrl);
    const raw = await fetchText(url);
    const items = parseSkillPositionsYaml(raw);
    return items
        .map(item => entryFromPositionItem(item, config.ossBaseUrl))
        .filter((entry): entry is SkillPositionEntry => entry !== undefined);
}

export async function findSkillByName(
    config: MrkhubConfig,
    skillName: string
): Promise<SkillPositionEntry | undefined> {
    const index = await loadSkillPositions(config);
    const normalized = normalizeSkillId(skillName);
    return index.find(e => e.name === normalized);
}
