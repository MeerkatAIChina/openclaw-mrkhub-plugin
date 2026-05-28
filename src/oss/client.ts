/**
 * OSS 客户端工具函数
 * 用于构建 OSS 公共读 URL
 */

const SKILL_INDEX_FILE = 'skill-index.yaml';

/**
 * 获取 skill-index.yaml 的完整 URL
 */
export function getSkillIndexUrl(baseUrl: string): string {
    const normalized = baseUrl.replace(/\/$/, '');
    return `${normalized}/${SKILL_INDEX_FILE}`;
}

/**
 * 获取 skill 文件的完整 URL
 * @param baseUrl OSS bucket base URL
 * @param skillPath skill 在 OSS 中的路径（如 skills/foo/）
 * @param filename 文件名（如 SKILL.md）
 */
export function getSkillFileUrl(baseUrl: string, skillPath: string, filename: string): string {
    const normalized = baseUrl.replace(/\/$/, '');
    const normalizedPath = skillPath.replace(/^\//, '').replace(/\/$/, '');
    return `${normalized}/${normalizedPath}/${filename}`;
}

/**
 * 从 OSS URL 获取文件内容
 */
export async function fetchText(url: string): Promise<string> {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`获取文件失败 ${url}: ${res.status}`);
    }
    return res.text();
}

/**
 * 从 OSS URL 获取二进制内容
 */
export async function fetchBuffer(url: string): Promise<Buffer> {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`获取文件失败 ${url}: ${res.status}`);
    }
    return Buffer.from(await res.arrayBuffer());
}
