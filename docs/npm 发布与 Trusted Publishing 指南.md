# npm 发布与 Trusted Publishing 指南

本文说明如何将 `@meerkat-ai/openclaw-mrkhub-plugin` 发布到 npm，并通过 GitHub Actions + Trusted Publishing 实现自动发布。

## 概览

| 阶段 | 方式 | 说明 |
|------|------|------|
| 首次发布 | 本地手动 + OTP | 包必须先存在于 npm，才能配置 Trusted Publisher |
| 后续发布 | GitHub Actions + OIDC | 推 tag 触发 CI，无需 NPM_TOKEN |

**Trusted Publishing**：CI 通过 OpenID Connect 向 npm 换取短期发布凭证，比长期 Token（含 Bypass 2FA）更安全，是 npm 推荐的 CI/CD 发布方式。

官方文档：https://docs.npmjs.com/trusted-publishers/

---

## 前置条件

- npm 组织：`meerkat-ai`（scope `@meerkat-ai`）
- GitHub 仓库：`MeerkatAIChina/openclaw-mrkhub-plugin`
- 发布账号是组织成员，且已开启 2FA
- `package.json` 已配置：
  - `name`: `@meerkat-ai/openclaw-mrkhub-plugin`
  - `publishConfig.access`: `public`
  - `repository.url` 指向上述 GitHub 仓库

---

## 一、首次手动发布

Trusted Publishing 需在 npm 包设置页配置，**包必须先发布至少一次**。

### 1. 注意 registry

若本机默认 registry 为 npmmirror（只读镜像），发布时必须指定官方源：

```bash
npm publish --access public --registry https://registry.npmjs.org/
```

日常 `pnpm install` 可继续用镜像，仅 publish 时指定官方源。

### 2. 2FA / OTP

账号开启 2FA 时，发布需一次性验证码（身份验证器 App 中的 6 位数字）：

```bash
npm publish --access public --registry https://registry.npmjs.org/ --otp=123456
```

`123456` 替换为 Authenticator 当前码（Google Authenticator、Microsoft Authenticator 等）。

### 3. 发布前检查

```bash
pnpm verify
npm pack --dry-run   # 确认 tarball 内容
```

预期包含：`dist/`、`openclaw.plugin.json`、`package.json`、`README.md`、`CHANGELOG.md`。

### 4. 发布后打 tag（可选但建议）

```bash
git tag v0.1.0
git push origin v0.1.0
```

---

## 二、配置 npm Trusted Publisher

首次发布成功后：

1. 打开 https://www.npmjs.com/package/@meerkat-ai/openclaw-mrkhub-plugin/settings
2. 找到 **Trusted Publisher** → 选择 **GitHub Actions**
3. 填写：

| 字段 | 值 |
|------|-----|
| Organization / Owner | `MeerkatAIChina` |
| Repository | `openclaw-mrkhub-plugin` |
| Workflow filename | `publish.yml` |

4. 保存

**注意：**

- Workflow 文件名必须与 `.github/workflows/` 下文件**完全一致**（含 `.yml` 扩展名）
- 字段区分大小写
- 每个包只能绑定一个 Trusted Publisher
- npm 保存时不会校验配置是否正确，首次 CI 发布失败时再核对

### 可选：收紧 Token 权限

Trusted Publishing 验证通过后，可在包 Settings → **Publishing access** 中选择 **Require two-factor authentication and disallow tokens**，禁止长期 Token 发布，仅保留 OIDC 与手动 2FA 发布。

---

## 三、GitHub Actions 工作流

在仓库创建 `.github/workflows/publish.yml`：

```yaml
name: Publish Package

on:
  push:
    tags:
      - 'v*'

permissions:
  id-token: write   # OIDC 必需
  contents: read

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 10

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          registry-url: 'https://registry.npmjs.org'

      - run: npm install -g npm@latest   # Trusted Publishing 需 npm ≥ 11.5.1

      - run: pnpm install --frozen-lockfile
      - run: pnpm verify
      - run: npm publish --access public
```

**要点：**

- `id-token: write` 不可省略
- **不需要** `NPM_TOKEN` / `NODE_AUTH_TOKEN`
- 使用 GitHub 托管 runner（不支持 self-hosted）
- `repository.url` 必须与当前 GitHub 仓库一致，否则 OIDC 校验失败
- `prepublishOnly` 会在 publish 前自动执行 `pnpm build`

---

## 四、后续版本发布流程

1. 更新 `package.json` 的 `version`
2. 更新 `CHANGELOG.md`
3. 提交并推送
4. 打 tag 并推送：

```bash
git tag v0.2.0
git push origin v0.2.0
```

5. 在 GitHub Actions 查看 **Publish Package** 是否成功
6. 确认 npm 页面：https://www.npmjs.com/package/@meerkat-ai/openclaw-mrkhub-plugin

---

## 五、安装验证

```bash
openclaw plugins install @meerkat-ai/openclaw-mrkhub-plugin
```

---

## 常见问题

### `ENEEDAUTH` / `Unable to authenticate`

- npm 上 Trusted Publisher 的 workflow 文件名是否与 `.github/workflows/publish.yml` 一致
- workflow 是否包含 `id-token: write`
- Owner / Repository 是否正确
- npm CLI 版本是否 ≥ 11.5.1

### `403` + Two-factor authentication required

本地发布未带 OTP，或未使用 Granular Token。CI 场景应使用 Trusted Publishing，不要用 Bypass 2FA Token。

### 发布指向 `registry.npmmirror.com`

本机 `~/.npmrc` 默认 registry 为镜像，publish 时加 `--registry https://registry.npmjs.org/`。

### `workflow_call` 嵌套调用

若 publish 在子 workflow 中执行，Trusted Publisher 匹配的是**调用方** workflow 名，且父、子 workflow 都需 `id-token: write`。

### 私有依赖

Trusted Publishing 仅覆盖 `npm publish`。若 `pnpm install` 需访问私有 npm 包，另配只读 Token 给 install 步骤，publish 步骤仍不用 Token。

---

## 参考

- [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/)
- [GitHub Actions OIDC](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
- [npm 组织创建](https://docs.npmjs.com/creating-an-organization/)
