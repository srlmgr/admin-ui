import { fetchCurrentUser } from "@/api/currentUser";
import { createLoginUrl, getSafeReturnTo } from "@/auth/returnTo";
import { setError, setLoading, setUser } from "@/store/slices/authSlice";
import { Result, Spin, Typography } from "antd";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";

export function CallbackPage() {
	const dispatch = useDispatch();
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const returnTo = getSafeReturnTo(searchParams.get("returnTo"));

	useEffect(() => {
		const handleCallback = async () => {
			try {
				dispatch(setLoading(true));
				const { status, user } = await fetchCurrentUser();

				if (status !== 200 || !user) {
					dispatch(setError("Unable to load authenticated user"));
					navigate(createLoginUrl(returnTo), { replace: true });
					return;
				}

				dispatch(setUser(user));

				navigate(returnTo ?? "/", { replace: true });
			} catch (err) {
				const message =
					err instanceof Error
						? err.message
						: "Authentication failed";
				dispatch(setError(message));
				navigate(createLoginUrl(returnTo), { replace: true });
			} finally {
				dispatch(setLoading(false));
			}
		};

		handleCallback();
	}, [dispatch, navigate, returnTo]);

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
