import { RootState } from "@/store";
import { clearUser } from "@/store/slices/authSlice";
import { useThemeMode } from "@/theme/themeMode";
import {
	ApartmentOutlined,
	AppstoreOutlined,
	CalendarOutlined,
	CarOutlined,
	EnvironmentOutlined,
	ExperimentOutlined,
	LogoutOutlined,
	MoonOutlined,
	SunOutlined,
	TeamOutlined,
	TrophyOutlined,
	UserOutlined,
} from "@ant-design/icons";
import {
	Button,
	Layout,
	Menu,
	Space,
	Switch,
	theme,
	Tooltip,
	Typography,
} from "antd";
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
	const { mode, toggleMode } = useThemeMode();
	const isDarkMode = mode === "dark";
	const user = useSelector((state: RootState) => state.auth.user);
	const {
		token: { colorBgContainer, borderRadiusLG },
	} = theme.useToken();

	// Redirect to login if no user
	if (!user) {
		return <Navigate to="/login" replace />;
	}

	const selectedKey = location.pathname.split("/")[1] || "users";
	const headerTextColor = isDarkMode ? "white" : "rgba(0,0,0,0.88)";
	const headerSubTextColor = isDarkMode
		? "rgba(255,255,255,0.55)"
		: "rgba(0,0,0,0.45)";
	const headerControlColor = isDarkMode ? "white" : "rgba(0,0,0,0.88)";

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
					background: isDarkMode ? undefined : colorBgContainer,
				}}
			>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						whiteSpace: "nowrap",
					}}
				>
					<span
						style={{
							color: headerTextColor,
							fontSize: "18px",
							fontWeight: "bold",
							lineHeight: "1.2",
						}}
					>
						Admin Dashboard
					</span>
					<span
						style={{
							color: headerSubTextColor,
							fontSize: "11px",
							lineHeight: "1.2",
						}}
					>
						{import.meta.env.VITE_APP_VERSION ?? "dev"}
					</span>
				</div>
				<Menu
					theme={isDarkMode ? "dark" : "light"}
					mode="horizontal"
					selectedKeys={[selectedKey]}
					items={menuItems}
					onClick={({ key }) => navigate(`/${key}`)}
					style={{ flex: 1, minWidth: 0, marginLeft: "48px" }}
				/>
				<Space>
					<Tooltip
						title={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
					>
						<Switch
							checked={isDarkMode}
							onChange={toggleMode}
							checkedChildren={<MoonOutlined />}
							unCheckedChildren={<SunOutlined />}
						/>
					</Tooltip>
					<Text style={{ color: headerControlColor }}>
						Welcome, {user.firstName ?? user.name}
					</Text>
					<Button
						type="text"
						icon={<LogoutOutlined />}
						onClick={handleLogout}
						style={{ color: headerControlColor }}
					>
						Logout
					</Button>
				</Space>
			</Header>
			<Layout>
				<Sider width={200} style={{ background: colorBgContainer }}>
					<Menu
						theme={isDarkMode ? "dark" : "light"}
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
