# AI Agent Guidelines for admin-ui

Use this file as the quick-start for coding agents. Keep it minimal and link to canonical docs.

## First 60 Seconds

1. Install and run checks:

```bash
pnpm install
pnpm lint
pnpm test:no-watch
```

2. Start the app when UI behavior matters:

```bash
pnpm dev
```

3. If API-backed screens fail, verify backend is running on `localhost:8080` (Vite proxies `/api` there).

## Key Project Facts

- Stack: React 19 + TypeScript + Vite + Ant Design + Redux Toolkit.
- Routing: React Router with public routes (`/login`, `/callback`) and protected routes under `AppLayout`.
- API: ConnectRPC gRPC-web clients via generated protobuf package `@buf/srlmgr_api.bufbuild_es`.
- Package manager: `pnpm` only.

## Source of Truth

- Runtime transport format and env/config precedence: [README.md](README.md)
- Authentication flow details: [docs/AUTHENTICATION.md](docs/AUTHENTICATION.md)

Do not duplicate those docs in PR descriptions or new instructions files; link to them.

## High-Value File Map

- App entry and router: [src/main.tsx](src/main.tsx), [src/App.tsx](src/App.tsx), [src/router/index.tsx](src/router/index.tsx)
- Protected layout and navigation: [src/components/Layout/AppLayout.tsx](src/components/Layout/AppLayout.tsx)
- Auth state and hook: [src/store/slices/authSlice.ts](src/store/slices/authSlice.ts), [src/store/index.ts](src/store/index.ts), [src/hooks/useAuth.ts](src/hooks/useAuth.ts)
- API transport and clients: [src/api/client.ts](src/api/client.ts), [src/api/grpcClients.ts](src/api/grpcClients.ts)
- Domain API wrappers (examples): [src/api/drivers.ts](src/api/drivers.ts), [src/api/simulations.ts](src/api/simulations.ts)
- Config loading behavior: [src/config.ts](src/config.ts), [public/config.json](public/config.json)

## Implementation Conventions

- Keep domain pages under `src/pages/<Domain>/<Domain>Page.tsx`.
- Add route entries in [src/router/index.tsx](src/router/index.tsx).
- Prefer typed API wrapper functions in `src/api/*` instead of calling gRPC clients directly from page components.
- Preserve import alias style (`@/...`) used by the codebase.
- For auth-sensitive requests, ensure cookie/session behavior is preserved (`credentials: "include"` where required by existing flow).

## Testing and Validation

- Unit/component tests live in `__test__` folders near the feature.
- Use React Testing Library + Vitest patterns shown in [src/pages/Login/**test**/LoginPage.spec.tsx](src/pages/Login/__test__/LoginPage.spec.tsx).
- Before finishing a change, run:

```bash
pnpm lint
pnpm test:no-watch
pnpm build
```

## Common Pitfalls

- Backend not running causes `/api` failures during local dev.
- Runtime config differs by environment: dev uses Vite env vars; prod uses `public/config.json`.
- Generated protobuf field names may differ from assumptions; verify types directly from imported package symbols.

## Typical Task Flow

1. Read issue and identify impacted route/page + API wrapper files.
2. Implement smallest viable change in page + API wrapper + route/store updates if needed.
3. Add/adjust tests near changed feature.
4. Run lint, tests, and build.
5. Summarize behavior changes and any backend contract assumptions in the PR.
