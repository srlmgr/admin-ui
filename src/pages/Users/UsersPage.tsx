import { Typography } from 'antd'

const { Title } = Typography

export function UsersPage() {
  return (
    <div>
      <Title level={2}>Users</Title>
      <p>Manage system users.</p>
    </div>
  )
}
