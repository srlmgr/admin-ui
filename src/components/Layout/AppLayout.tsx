import { Layout, Menu, theme } from 'antd'
import {
  UserOutlined,
  CarOutlined,
  ExperimentOutlined,
  TrophyOutlined,
  EnvironmentOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'

const { Header, Content, Sider } = Layout

const menuItems = [
  { key: 'users', icon: <UserOutlined />, label: 'Users' },
  { key: 'drivers', icon: <TeamOutlined />, label: 'Drivers' },
  { key: 'simulation', icon: <ExperimentOutlined />, label: 'Simulation' },
  { key: 'series', icon: <TrophyOutlined />, label: 'Series' },
  { key: 'tracks', icon: <EnvironmentOutlined />, label: 'Tracks' },
  { key: 'cars', icon: <CarOutlined />, label: 'Cars' },
]

export function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken()

  const selectedKey = location.pathname.replace('/', '') || 'users'

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
        }}
      >
        <div
          style={{
            color: 'white',
            fontSize: '18px',
            fontWeight: 'bold',
            marginRight: '48px',
            whiteSpace: 'nowrap',
          }}
        >
          SRL Manager
        </div>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(`/${key}`)}
          style={{ flex: 1, minWidth: 0 }}
        />
      </Header>
      <Layout>
        <Sider width={200} style={{ background: colorBgContainer }}>
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            style={{ height: '100%', borderRight: 0 }}
            items={menuItems}
            onClick={({ key }) => navigate(`/${key}`)}
          />
        </Sider>
        <Layout style={{ padding: '24px' }}>
          <Content
            style={{
              padding: 24,
              margin: 0,
              minHeight: 280,
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            <Outlet />
          </Content>
        </Layout>
      </Layout>
    </Layout>
  )
}
