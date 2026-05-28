/**
 * mrkhub 插件默认配置与 OSS 配置解析。
 * - 常量：默认 OSS base URL
 * - resolveConfig：合并用户 openclaw.json 配置与上述默认值
 */
import type { MrkhubConfig } from './types.js';

// OSS bucket 基础 URL
export const DEFAULT_OSS_BASE_URL = 'https://meerkatai-skills.oss-cn-shanghai.aliyuncs.com';

export function resolveConfig(pluginConfig: Record<string, unknown> | undefined): MrkhubConfig {
    const raw = pluginConfig ?? {};
    return {
        ossBaseUrl: typeof raw.ossBaseUrl === 'string' ? raw.ossBaseUrl : DEFAULT_OSS_BASE_URL,
        installDir: typeof raw.installDir === 'string' ? raw.installDir : undefined,
    };
}
