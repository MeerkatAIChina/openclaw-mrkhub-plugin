export type SkillIndexYamlEntry = {
    skill_id: string;
    name: string;
    path: string;
    category?: string;
    type?: string;
    files?: string[];
};

export function normalizeSkillId(skillId: string): string {
    return skillId
        .toLowerCase()
        .replace(/-/g, '_')
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/^_+/, '')
        .replace(/_+/g, '_');
}

export function parseSkillIndexYaml(raw: string): SkillIndexYamlEntry[] {
    const skills: SkillIndexYamlEntry[] = [];
    let current: Partial<SkillIndexYamlEntry> | null = null;
    let inFilesList = false;

    for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
            continue;
        }

        // 检测新的 skill 条目
        if (trimmed.startsWith('- skill_id:')) {
            if (current?.skill_id && current.name && current.path) {
                skills.push(current as SkillIndexYamlEntry);
            }
            current = { skill_id: trimmed.slice('- skill_id:'.length).trim() };
            inFilesList = false;
            continue;
        }

        if (!current) {
            continue;
        }

        // 检测是否进入 files 列表
        if (trimmed.startsWith('files:')) {
            inFilesList = true;
            current.files = [];
            continue;
        }

        // 如果在 files 列表中，收集列表项
        if (inFilesList && trimmed.startsWith('- ')) {
            const fileItem = trimmed.slice(2).trim();
            if (fileItem && current.files) {
                current.files.push(fileItem);
            }
            continue;
        }

        // 如果遇到其他字段，退出 files 列表模式
        if (inFilesList && !trimmed.startsWith('- ') && trimmed.includes(':')) {
            inFilesList = false;
        }

        // 解析普通字段
        if (trimmed.startsWith('name:')) {
            current.name = trimmed.slice('name:'.length).trim();
        } else if (trimmed.startsWith('path:')) {
            current.path = trimmed.slice('path:'.length).trim().replace(/\/+$/, '');
        } else if (trimmed.startsWith('category:')) {
            current.category = trimmed.slice('category:'.length).trim();
        } else if (trimmed.startsWith('type:')) {
            current.type = trimmed.slice('type:'.length).trim();
        }
    }

    if (current?.skill_id && current.name && current.path) {
        skills.push(current as SkillIndexYamlEntry);
    }

    return skills;
}
