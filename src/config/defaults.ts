/**
 * mrkhub 插件默认配置与仓库 spec 解析。
 * - 常量：默认 GitHub 仓库列表、分支、skills 子路径
 * - resolveConfig：合并用户 openclaw.json 配置与上述默认值
 * - parseRepositorySpec：将 owner/repo、@ref、GitHub URL 等解析为索引/安装所需字段
 */
import type { MrkhubConfig } from './types.js';

// skills 仓库地址
export const DEFAULT_REPOSITORIES = ['MeerkatAIChina/manufacturing-ai-efficiency-Skill'];

// todo: 记得改回 main 分支
// 仓库分支
// export const DEFAULT_REF = 'main';
export const DEFAULT_REF = 'ling';

// skills 的根目录
export const DEFAULT_SKILLS_SUBPATH = 'skills';

export function resolveConfig(pluginConfig: Record<string, unknown> | undefined): MrkhubConfig {
    const raw = pluginConfig ?? {};
    const repositories = Array.isArray(raw.repositories)
        ? raw.repositories.filter((r): r is string => typeof r === 'string')
        : DEFAULT_REPOSITORIES;
    return {
        repositories: repositories.length > 0 ? repositories : DEFAULT_REPOSITORIES,
        installDir: typeof raw.installDir === 'string' ? raw.installDir : undefined,
        githubToken:
            typeof raw.githubToken === 'string' ? raw.githubToken : process.env.GITHUB_TOKEN,
        defaultRef: typeof raw.defaultRef === 'string' ? raw.defaultRef : DEFAULT_REF,
    };
}

export function parseRepositorySpec(
    spec: string,
    defaultRef: string
): { owner: string; repo: string; ref: string; skillsPath: string } {
    const trimmed = spec.trim().replace(/^https?:\/\/github\.com\//i, '');
    const [repoPart, refFromHash] = trimmed.split('#');
    const [pathPart, refFromAt] = repoPart.split('@');
    const segments = pathPart.replace(/\/+$/, '').split('/').filter(Boolean);
    if (segments.length < 2) {
        throw new Error(`无效的仓库地址: ${spec}`);
    }
    const owner = segments[0]!;
    const repo = segments[1]!;
    let ref = refFromAt ?? refFromHash ?? defaultRef;
    let skillsPath = DEFAULT_SKILLS_SUBPATH;
    const rest = segments.slice(2);
    if (rest[0] === 'tree' || rest[0] === 'blob') {
        ref = rest[1] ?? ref;
        const pathParts = rest.slice(2);
        if (pathParts.length > 0) {
            skillsPath = pathParts.join('/');
        }
    } else if (rest.length > 0) {
        skillsPath = rest.join('/');
    }
    return { owner, repo, ref, skillsPath };
}
