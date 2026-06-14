import { RootState } from "@/store";
import { clearUser } from "@/store/slices/authSlice";
import {
	ApartmentOutlined,
	AppstoreOutlined,
	CalendarOutlined,
	CarOutlined,
	EnvironmentOutlined,
	ExperimentOutlined,
	LogoutOutlined,
	TeamOutlined,
	TrophyOutlined,
	UserOutlined,
} from "@ant-design/icons";
import { Button, Layout, Menu, Space, theme, Typography } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";

const { Header, Content, Sider } = Layout;
const { Text } = Typography;

const menuItems = [
	{ key: "users", icon: <UserOutlined />, label: "Users" },
	{ key: "drivers", icon: <TeamOutlined />, label: "Drivers" },
	{ key: "simulation", icon: <ExperimentOutlined />, label: "Simulation" },
	{ key: "series", icon: <TrophyOutlined />, label: "Series" },
	{ key: "seasons", icon: <CalendarOutlined />, label: "Seasons" },
	{
		key: "point-systems",
		icon: <ApartmentOutlined />,
		label: "Point Systems",
	},
	{ key: "tracks", icon: <EnvironmentOutlined />, label: "Tracks" },
	{ key: "cars", icon: <CarOutlined />, label: "Cars" },
	{ key: "car-classes", icon: <AppstoreOutlined />, label: "Car Classes" },
];

export function AppLayout() {
	const dispatch = useDispatch();
	const navigate = useNavigate();
	const location = useLocation();
	const user = useSelector((state: RootState) => state.auth.user);
	const {
		token: { colorBgContainer, borderRadiusLG },
	} = theme.useToken();

	// Redirect to login if no user
	if (!user) {
		return <Navigate to="/login" replace />;
	}

	const selectedKey = location.pathname.split("/")[1] || "users";

	const handleLogout = async () => {
		try {
			// Notify backend of logout
			await fetch("/api/logout", {
				method: "POST",
				credentials: "include",
			});
		} finally {
			// Clear Redux store
			dispatch(clearUser());
			// Navigate to login
			navigate("/login", { replace: true });
		}
	};

	return (
		<Layout style={{ minHeight: "100vh" }}>
			<Header
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					padding: "0 24px",
				}}
			>
				<div
					style={{
						color: "white",
						fontSize: "18px",
						fontWeight: "bold",
						whiteSpace: "nowrap",
					}}
				>
					Admin Dashboard
				</div>
				<Menu
					theme="dark"
					mode="horizontal"
					selectedKeys={[selectedKey]}
					items={menuItems}
					onClick={({ key }) => navigate(`/${key}`)}
					style={{ flex: 1, minWidth: 0, marginLeft: "48px" }}
				/>
				<Space>
					<Text style={{ color: "white" }}>
						Welcome, {user.firstName ?? user.name}
					</Text>
					<Button
						type="text"
						icon={<LogoutOutlined />}
						onClick={handleLogout}
						style={{ color: "white" }}
					>
						Logout
					</Button>
				</Space>
			</Header>
			<Layout>
				<Sider width={200} style={{ background: colorBgContainer }}>
					<Menu
						mode="inline"
						selectedKeys={[selectedKey]}
						style={{ height: "100%", borderRight: 0 }}
						items={menuItems}
						onClick={({ key }) => navigate(`/${key}`)}
					/>
				</Sider>
				<Layout style={{ padding: "24px" }}>
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
	);
}
