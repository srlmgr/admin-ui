import { Alert, Button, Card, Typography } from 'antd'
import { LoginOutlined } from '@ant-design/icons'
import { useSearchParams } from 'react-router-dom'

const { Title } = Typography

const ERROR_MESSAGES: Record<string, string> = {
  auth_failed: 'Authentication failed. Please try again.',
  access_denied: 'Access was denied. Please contact your administrator.',
}

export function LoginPage() {
  const [searchParams] = useSearchParams()
  const errorKey = searchParams.get('error')
  const errorMessage = errorKey ? (ERROR_MESSAGES[errorKey] ?? 'An error occurred. Please try again.') : null

  const handleLogin = () => {
    const redirectUri = `${window.location.origin}/callback`
    window.location.href = `/api/auth/login?redirect_uri=${encodeURIComponent(redirectUri)}`
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#f0f2f5',
      }}
    >
      <Card style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={2}>SRL Manager</Title>
          <Typography.Text type="secondary">Administration Portal</Typography.Text>
        </div>
        {errorMessage && (
          <Alert
            type="error"
            message={errorMessage}
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
        <Button
          type="primary"
          size="large"
          icon={<LoginOutlined />}
          onClick={handleLogin}
          block
        >
          Sign In
        </Button>
      </Card>
    </div>
  )
}
