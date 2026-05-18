# AGENTS.md

## Cursor Cloud specific instructions

This is a single-package OpenClaw plugin (`@meerkat/openclaw-mrkhub-plugin`). No databases, Docker, or background services needed for development.

### Prerequisites

- Node.js ≥ 22.19 (pre-installed)
- pnpm 10.20 (pre-installed, enforced via `packageManager` field)

### Dev commands (see `package.json` scripts)

| Task | Command |
|------|---------|
| Install deps | `pnpm install` |
| Type check | `pnpm typecheck` |
| Unit tests | `pnpm test` |
| Lint | `pnpm lint` |
| Build | `pnpm build` |

### Notes

- `pnpm install` may warn about ignored build scripts. This is expected — the plugin's dev workflow (typecheck, test, lint, build) works without running those postinstall scripts.
- Full E2E testing requires an OpenClaw Gateway (≥ 2026.5.12) which is not available in the cloud agent environment. Unit tests via `pnpm test` cover config, matcher, intent, and path logic.
- PR pre-merge checklist: `pnpm typecheck && pnpm test && pnpm lint && pnpm build` (per README).
