# AI Agent Guidelines for admin-ui

This document helps AI agents understand the project structure, conventions, and workflows to be immediately productive.

## Project Overview

**admin-ui** is a React 19 + TypeScript frontend administration dashboard using:
- **Build**: Vite with pnpm package manager
- **State Management**: Redux (react-redux) for user authentication and app state
- **Routing**: React Router v7 with protected route pattern (login → callback → authenticated pages)
- **UI Framework**: Ant Design (antd) components
- **API Communication**: ConnectRPC (@connectrpc/connect-web) for type-safe gRPC-web calls
- **Testing**: Vitest with watch mode support
- **Code Quality**: ESLint + TypeScript
- **Backend**: Proxied via Vite to `http://localhost:8080` at `/api`

## Essential Commands

### Development
```bash
pnpm dev              # Start dev server (localhost:5173 with /api proxy)
pnpm build            # TypeScript check + Vite build to dist/
pnpm lint             # ESLint check all files
```

### Testing
```bash
pnpm test             # Vitest in watch mode
pnpm test:no-watch    # Vitest single run (CI mode)
```

### Package Management
- **Install**: `pnpm install` (uses pnpm-lock.yaml)
- **Add**: `pnpm add <package>` or `pnpm add -D <package>` (dev)
- Use pnpm, not npm or yarn

## Project Structure

```
src/
├── App.tsx                 # Root component with RouterProvider
├── main.tsx               # Entry point
├── api/
│   └── client.ts          # ConnectRPC transport setup (target: /api)
├── components/
│   └── Layout/
│       └── AppLayout.tsx   # Protected layout wrapper (logged-in users only)
├── pages/
│   ├── Login/LoginPage    # Public login page (no auth required)
│   ├── Callback/          # OAuth callback handler
│   ├── Users/             # Admin pages (protected)
│   ├── Drivers/
│   ├── Simulation/
│   ├── Series/
│   ├── Tracks/
│   └── Cars/
└── router/
    └── index.tsx          # Route definitions and layout
```

## Architecture Patterns

### Authentication & Routing
- **Public routes**: `/login`, `/callback` (no auth required)
- **Protected routes**: `/` layout children (requires login)
- **Redux store**: Stores user authentication state (to be implemented per GitHub issue #2)
- **Login flow**: POST `/api/login` → OAuth redirect → `/callback` → Redux store user → navigate to `/users`
- **Logout flow**: POST `/api/logout` → clear Redux store → navigate to `/login`

### Components
- **AppLayout** wraps all protected routes and provides user context (name + logout button in header)
- Pages are organized by domain (Users, Drivers, Cars, etc.)
- Ant Design components used throughout (Button, Table, Form, etc.)

### API Client
- ConnectRPC transport pre-configured to `/api` baseUrl
- Import: `import { createClient } from '@/api/client'`
- Type-safe RPC calls with protobuf messages
- Backend handles CORS and gRPC-web

### State Management
- **Redux with react-redux** for user state (authentication)
- User data should include at minimum: name/username for display in header
- Store structure TBD but should follow Redux best practices

## Common Development Patterns

### Creating a New Page
1. Create file: `src/pages/{Domain}/{DomainPage}.tsx`
2. Add route to `src/router/index.tsx` under AppLayout children
3. Import and use Ant Design components
4. Make API calls using ConnectRPC client

### Adding Redux State
1. Create store setup with Redux Toolkit (suggested but not yet implemented)
2. Add slices for user auth, domain data
3. Use `useDispatch()` and `useSelector()` in components

### API Calls
```typescript
import { createClient } from '@/api/client'
import { YourService } from '@/api/gen/your_service.pb' // protobuf generated

const client = createClient(YourService, transport)
const response = await client.yourMethod({ ... })
```

## Testing
- Tests go in `__test__/` directories (see `src/pages/Users/__test__/dummy.spec.ts`)
- Use Vitest syntax and React Testing Library for components
- Run with `pnpm test` (watch) or `pnpm test:no-watch` (CI)

## Code Quality Standards
- **TypeScript**: Strict mode enabled (tsconfig.json)
- **ESLint**: Runs on all .ts/.tsx files
- **No console warnings**: React Hooks and React Refresh plugins enforce best practices
- **Prettier**: Not configured; ESLint handles formatting

## Important Notes
- **Backend requirement**: Backend must be running on `localhost:8080` for dev mode
- **Environment variables**: Check if `.env` or `.env.local` files are needed (not currently in repo)
- **Build output**: Production build goes to `dist/` directory
- **Protocol Buffers**: Backend communicates via ConnectRPC (ensure .proto files are generated/available)

## When Starting on a GitHub Issue
1. Read the issue fully to understand requirements
2. Check if Redux store setup is needed (Issue #2)
3. Identify which routes/pages are affected
4. Run `pnpm dev` to start dev server and test locally
5. Create feature branch and make incremental commits
6. Test with `pnpm test` and `pnpm lint` before submitting PR
