import { RootState } from "@/store";
import { setError, setLoading } from "@/store/slices/authSlice";
import { LoginOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Space, Typography } from "antd";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

const { Title, Paragraph } = Typography;

export function LoginPage() {
	const dispatch = useDispatch();
	const { isLoading, error, user } = useSelector(
		(state: RootState) => state.auth,
	);

	// Clear any lingering error on component mount
	useEffect(() => {
		dispatch(setError(""));
	}, [dispatch]);

	const handleLogin = async () => {
		dispatch(setLoading(true));
		dispatch(setError(""));

		// Provide the frontend callback URL so backend can return here on success.
		const callbackUrl = `${window.location.origin}/callback`;
		const params = new URLSearchParams({
			callbackUrl,
			callback_url: callbackUrl,
		});

		// Use full-page navigation so backend OAuth redirects are handled by the browser.
		window.location.assign(`/api/login?${params.toString()}`);
	};

	// Safety check: if somehow user is logged in, redirect
	if (user) {
		return <Navigate to="/users" replace />;
	}

	return (
		<div
			style={{
				display: "flex",
				justifyContent: "center",
				alignItems: "center",
				minHeight: "100vh",
				background: "#f0f2f5",
			}}
		>
			<Card
				style={{
					width: "100%",
					maxWidth: 400,
					boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
				}}
			>
				<Space
					orientation="vertical"
					style={{ width: "100%" }}
					size="large"
				>
					<div style={{ textAlign: "center" }}>
						<Title level={2}>
							SimRacingLeague Manager Administration
						</Title>
						<Paragraph type="secondary">
							Welcome! Please log in to continue.
						</Paragraph>
					</div>

					{error && <Alert type="error" title={error} showIcon />}

					<Button
						type="primary"
						size="large"
						icon={<LoginOutlined />}
						onClick={handleLogin}
						loading={isLoading}
						block
					>
						Sign In
					</Button>
				</Space>
			</Card>
		</div>
	);
}
