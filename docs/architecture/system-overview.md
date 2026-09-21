# System overview

M0 establishes a pnpm TypeScript monorepo with two runnable applications and
three placeholder packages for future shared code.

- `apps/web` is a minimal Vite browser application.
- `apps/api` is a Node HTTP service with `GET /health`.
- `packages/domain`, `packages/database`, and `packages/shared` are intentionally
  empty boundaries; they do not yet select or configure implementation details.

No external services, database, payment provider, carrier integration, label
generation, or tracking functionality is included in this milestone.
