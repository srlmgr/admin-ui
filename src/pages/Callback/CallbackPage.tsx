import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Spin, Result, Typography } from 'antd'

export function CallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    handled.current = true

    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      navigate(`/login?error=${encodeURIComponent(error)}`, { replace: true })
      return
    }

    if (!code) {
      navigate('/login', { replace: true })
      return
    }

    const params = new URLSearchParams({ code })
    if (state) params.set('state', state)

    fetch(`/api/auth/callback?${params.toString()}`, { credentials: 'include' })
      .then((res) => {
        if (res.ok) {
          navigate('/', { replace: true })
        } else {
          navigate('/login?error=auth_failed', { replace: true })
        }
      })
      .catch(() => {
        navigate('/login?error=auth_failed', { replace: true })
      })
  }, [navigate, searchParams])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        gap: 16,
      }}
    >
      <Result
        icon={<Spin size="large" />}
        title="Signing you in…"
        subTitle={<Typography.Text type="secondary">Please wait while we complete the login.</Typography.Text>}
      />
    </div>
  )
}
