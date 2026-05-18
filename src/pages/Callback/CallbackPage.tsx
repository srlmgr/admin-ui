import { fetchCurrentUser } from "@/api/currentUser";
import { setError, setLoading, setUser } from "@/store/slices/authSlice";
import { Result, Spin, Typography } from "antd";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";

export function CallbackPage() {
	const dispatch = useDispatch();
	const navigate = useNavigate();

	useEffect(() => {
		const handleCallback = async () => {
			try {
				dispatch(setLoading(true));
				const { status, user } = await fetchCurrentUser();

				if (status !== 200 || !user) {
					dispatch(setError("Unable to load authenticated user"));
					navigate("/login", { replace: true });
					return;
				}

				dispatch(setUser(user));

				// Redirect to app landing page
				navigate("/", { replace: true });
			} catch (err) {
				const message =
					err instanceof Error
						? err.message
						: "Authentication failed";
				dispatch(setError(message));
				navigate("/login", { replace: true });
			} finally {
				dispatch(setLoading(false));
			}
		};

		handleCallback();
	}, [dispatch, navigate]);

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				justifyContent: "center",
				alignItems: "center",
				minHeight: "100vh",
				gap: 16,
			}}
		>
			<Result
				icon={<Spin size="large" />}
				title="Signing you in…"
				subTitle={
					<Typography.Text type="secondary">
						Please wait while we complete the login.
					</Typography.Text>
				}
			/>
		</div>
	);
}
