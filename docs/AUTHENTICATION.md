# Authentication & User State Management

This guide explains how authentication works in admin-ui and how to implement the login/logout flow using Redux.

## Overview

The authentication system uses:

- **OAuth-like flow** via backend at `/api/login` endpoint
- **Redux store** for persisting user state across page navigation
- **React Router** protected routes with `AppLayout` wrapper
- **Callback route** to handle OAuth redirect from IDP

## Architecture

### Flow Diagram

```
Unauthenticated User
        ↓
    /login page
        ↓
  Click "Login" button
        ↓
  POST /api/login (backend initiates IDP flow)
        ↓
  Redirect to IDP (external identity provider)
        ↓
  User authenticates with IDP
        ↓
  IDP redirects to /callback with auth code/token
        ↓
  Backend validates and returns user info
        ↓
  Store user in Redux store
        ↓
  Navigate to /users (or previous page)
        ↓
  Protected routes now accessible
```

### Component Hierarchy

```
App.tsx
└── RouterProvider
    ├── /login (public)
    │   └── LoginPage
    ├── /callback (public)
    │   └── CallbackPage
    └── / (protected)
        └── AppLayout (checks Redux for user)
            ├── Header (displays user name + logout button)
            └── Outlet (renders nested routes)
                ├── /users → UsersPage
                ├── /drivers → DriversPage
                ├── /simulation → SimulationPage
                ├── /series → SeriesPage
                ├── /tracks → TracksPage
                └── /cars → CarsPage
```

## Redux Store Setup

### 1. Install Redux & Dependencies

```bash
pnpm add @reduxjs/toolkit
pnpm add react-redux
```

These are already added to package.json (check with `pnpm list`).

### 2. Create Redux Store

Create `src/store/index.ts`:

```typescript
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";

export const store = configureStore({
	reducer: {
		auth: authReducer,
	},
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### 3. Create Auth Slice

Create `src/store/slices/authSlice.ts`:

```typescript
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface User {
	id: string;
	name: string;
	email?: string;
	// Add other user properties as needed
}

interface AuthState {
	user: User | null;
	isLoading: boolean;
	error: string | null;
}

const initialState: AuthState = {
	user: null,
	isLoading: false,
	error: null,
};

const authSlice = createSlice({
	name: "auth",
	initialState,
	reducers: {
		setUser: (state, action: PayloadAction<User>) => {
			state.user = action.payload;
			state.error = null;
		},
		clearUser: (state) => {
			state.user = null;
			state.error = null;
		},
		setLoading: (state, action: PayloadAction<boolean>) => {
			state.isLoading = action.payload;
		},
		setError: (state, action: PayloadAction<string>) => {
			state.error = action.payload;
		},
	},
});

export const { setUser, clearUser, setLoading, setError } = authSlice.actions;
export default authSlice.reducer;
```

### 4. Wire Redux into App

Update `src/main.tsx` to include Redux Provider:

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import App from './App.tsx'
import { store } from './store'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>,
)
```

## Pages Implementation

### LoginPage

Create `src/pages/Login/LoginPage.tsx`:

```typescript
import { Button, Card, Space, Typography } from 'antd'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { RootState } from '@/store'
import { setLoading, setError } from '@/store/slices/authSlice'

const { Title, Paragraph } = Typography

export const LoginPage = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { isLoading, error } = useSelector((state: RootState) => state.auth)

  const handleLogin = async () => {
    try {
      dispatch(setLoading(true))
      dispatch(setError(''))

      const response = await fetch('/api/login', {
        method: 'POST',
        credentials: 'include', // Include cookies for session management
      })

      if (!response.ok) {
        throw new Error('Login failed')
      }

      const data = await response.json()

      // Redirect to IDP or handle OAuth flow
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      dispatch(setError(message))
    } finally {
      dispatch(setLoading(false))
    }
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <Card style={{ width: '100%', maxWidth: 400 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Title level={2}>Admin Dashboard</Title>
          <Paragraph>Welcome! Please log in to continue.</Paragraph>

          <Button
            type="primary"
            size="large"
            onClick={handleLogin}
            loading={isLoading}
            block
          >
            Sign In
          </Button>

          {error && <div style={{ color: 'red', marginTop: 16 }}>{error}</div>}
        </Space>
      </Card>
    </div>
  )
}
```

### CallbackPage

Create `src/pages/Callback/CallbackPage.tsx`:

```typescript
import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Spin } from 'antd'
import { setUser, setLoading, setError } from '@/store/slices/authSlice'

export const CallbackPage = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        dispatch(setLoading(true))

        // Get the authorization code or token from URL params
        const code = searchParams.get('code')
        const state = searchParams.get('state')

        if (!code) {
          throw new Error('No authorization code received')
        }

        // Exchange code for user session via backend
        const response = await fetch('/api/callback', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, state }),
        })

        if (!response.ok) {
          throw new Error('Callback failed')
        }

        const userData = await response.json()

        // Store user in Redux
        dispatch(setUser({
          id: userData.id,
          name: userData.name,
          email: userData.email,
        }))

        // Redirect to dashboard
        navigate('/users', { replace: true })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Authentication failed'
        dispatch(setError(message))
        navigate('/login', { replace: true })
      } finally {
        dispatch(setLoading(false))
      }
    }

    handleCallback()
  }, [dispatch, navigate, searchParams])

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <Spin size="large" tip="Authenticating..." />
    </div>
  )
}
```

## AppLayout Component

Update `src/components/Layout/AppLayout.tsx` to use Redux:

```typescript
import { Outlet, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Layout, Button, Space, Typography } from 'antd'
import { LogoutOutlined } from '@ant-design/icons'
import { RootState } from '@/store'
import { clearUser } from '@/store/slices/authSlice'

const { Header, Content } = Layout
const { Text } = Typography

export const AppLayout = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const user = useSelector((state: RootState) => state.auth.user)

  // Redirect to login if no user
  if (!user) {
    navigate('/login', { replace: true })
    return null
  }

  const handleLogout = async () => {
    try {
      // Notify backend of logout
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } finally {
      // Clear Redux store
      dispatch(clearUser())
      // Navigate to login
      navigate('/login', { replace: true })
    }
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography.Title level={3} style={{ margin: 0 }}>Admin Dashboard</Typography.Title>
        <Space>
          <Text>Welcome, {user.name}</Text>
          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={handleLogout}
          >
            Logout
          </Button>
        </Space>
      </Header>
      <Content style={{ padding: '24px' }}>
        <Outlet />
      </Content>
    </Layout>
  )
}
```

## Router Configuration

Update `src/router/index.tsx` to include callback and redirect logic:

```typescript
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '../components/Layout/AppLayout'
import { LoginPage } from '../pages/Login/LoginPage'
import { CallbackPage } from '../pages/Callback/CallbackPage'
import { UsersPage } from '../pages/Users/UsersPage'
import { DriversPage } from '../pages/Drivers/DriversPage'
import { SimulationPage } from '../pages/Simulation/SimulationPage'
import { SeriesPage } from '../pages/Series/SeriesPage'
import { TracksPage } from '../pages/Tracks/TracksPage'
import { CarsPage } from '../pages/Cars/CarsPage'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/callback',
    element: <CallbackPage />,
  },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/users" replace /> },
      { path: 'users', element: <UsersPage /> },
      { path: 'drivers', element: <DriversPage /> },
      { path: 'simulation', element: <SimulationPage /> },
      { path: 'series', element: <SeriesPage /> },
      { path: 'tracks', element: <TracksPage /> },
      { path: 'cars', element: <CarsPage /> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])
```

## Hooks for Reuse

Create `src/hooks/useAuth.ts` for convenient auth access:

```typescript
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store";
import { clearUser, setUser } from "@/store/slices/authSlice";
import type { User } from "@/store/slices/authSlice";

export const useAuth = () => {
	const dispatch = useDispatch();
	const { user, isLoading, error } = useSelector(
		(state: RootState) => state.auth,
	);

	return {
		user,
		isLoading,
		error,
		login: (userData: User) => dispatch(setUser(userData)),
		logout: () => dispatch(clearUser()),
	};
};
```

## Testing Authentication

### Test Login Flow

Create `src/pages/Login/__test__/LoginPage.spec.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { LoginPage } from '../LoginPage'
import { store } from '@/store'

describe('LoginPage', () => {
  it('should render login button', () => {
    render(
      <Provider store={store}>
        <BrowserRouter>
          <LoginPage />
        </BrowserRouter>
      </Provider>
    )

    const button = screen.getByRole('button', { name: /sign in/i })
    expect(button).toBeInTheDocument()
  })

  it('should call /api/login on button click', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ redirectUrl: 'https://idp.example.com/auth' }),
    })
    global.fetch = fetchMock

    render(
      <Provider store={store}>
        <BrowserRouter>
          <LoginPage />
        </BrowserRouter>
      </Provider>
    )

    const button = screen.getByRole('button', { name: /sign in/i })
    fireEvent.click(button)

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/login', expect.any(Object))
    })
  })
})
```

## Best Practices

1. **Secure Session Handling**: Always include `credentials: 'include'` in fetch calls to maintain session cookies
2. **Error Handling**: Display user-friendly error messages on login/logout failures
3. **Loading States**: Show spinners or disable buttons during auth operations
4. **Token Refresh**: If using JWTs, implement token refresh logic on 401 responses
5. **HTTPS in Production**: Always use HTTPS to protect credentials
6. **Backend Validation**: Backend must validate all auth decisions; never trust frontend auth state alone

## Troubleshooting

### Issue: Redirects to login after page refresh

- **Cause**: User data only in Redux (lost on refresh)
- **Solution**: Persist auth state to localStorage or implement server-side session validation on app load

### Issue: CORS errors with /api/login

- **Cause**: Backend not configured for CORS or missing credentials
- **Solution**: Verify backend CORS policy and ensure `credentials: 'include'` is used

### Issue: Callback route not resolving

- **Cause**: `/callback` not in router configuration
- **Solution**: Ensure CallbackPage is registered in `src/router/index.tsx`

## See Also

- [AGENTS.md](../AGENTS.md) - Project architecture and conventions
- [.github/CONTRIBUTING.md](../.github/CONTRIBUTING.md) - Development workflow
- Redux Documentation: https://redux.js.org/
- React Router Documentation: https://reactrouter.com/
