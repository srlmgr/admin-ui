import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { resetTransport } from "./api/client";
import { fetchCurrentUser } from "./api/currentUser";
import App from "./App.tsx";
import { loadConfig } from "./config";
import "./index.css";
import { store } from "./store";
import { clearUser, setLoading, setUser } from "./store/slices/authSlice";

const DEFAULT_CURRENT_USER_POLL_SECONDS = 60;

let currentUserPollTimer: number | null = null;
let isCurrentUserPollInFlight = false;

function getCurrentUserPollIntervalMs(): number {
	const rawValue = import.meta.env.VITE_CURRENT_USER_POLL_SECONDS;
	if (rawValue === undefined) {
		return DEFAULT_CURRENT_USER_POLL_SECONDS * 1000;
	}

	const intervalSeconds = Number(rawValue);
	if (!Number.isFinite(intervalSeconds) || intervalSeconds <= 0) {
		console.warn(
			`Invalid VITE_CURRENT_USER_POLL_SECONDS value: ${rawValue}. Falling back to ${DEFAULT_CURRENT_USER_POLL_SECONDS}s.`,
		);
		return DEFAULT_CURRENT_USER_POLL_SECONDS * 1000;
	}

	return intervalSeconds * 1000;
}

function stopCurrentUserPolling(): void {
	if (currentUserPollTimer !== null) {
		window.clearInterval(currentUserPollTimer);
		currentUserPollTimer = null;
	}
}

function handleAuthFailure(): void {
	stopCurrentUserPolling();
	store.dispatch(clearUser());

	if (window.location.pathname !== "/login") {
		window.location.replace("/login");
	}
}

async function pollCurrentUser(): Promise<void> {
	if (isCurrentUserPollInFlight) {
		return;
	}

	isCurrentUserPollInFlight = true;

	try {
		const { status, user } = await fetchCurrentUser();

		if (status === 200 && user) {
			store.dispatch(setUser(user));
			return;
		}

		handleAuthFailure();
	} catch {
		handleAuthFailure();
	} finally {
		isCurrentUserPollInFlight = false;
	}
}

function startCurrentUserPolling(): void {
	stopCurrentUserPolling();
	const intervalMs = getCurrentUserPollIntervalMs();

	currentUserPollTimer = window.setInterval(() => {
		void pollCurrentUser();
	}, intervalMs);
}

async function bootstrapAuth() {
	store.dispatch(setLoading(true));

	try {
		const { status, user } = await fetchCurrentUser();

		if (status === 200 && user) {
			store.dispatch(setUser(user));
			startCurrentUserPolling();
			return true;
		}

		handleAuthFailure();

		if (window.location.pathname !== "/login") {
			return false;
		}

		return true;
	} catch {
		handleAuthFailure();

		if (window.location.pathname !== "/login") {
			return false;
		}

		return true;
	} finally {
		store.dispatch(setLoading(false));
	}
}

loadConfig()
	.then(async () => {
		// Reset transport cache after config is loaded so it's created with correct settings
		resetTransport();

		const shouldRender = await bootstrapAuth();
		if (!shouldRender) {
			return;
		}

		createRoot(document.getElementById("root")!).render(
			<StrictMode>
				<Provider store={store}>
					<App />
				</Provider>
			</StrictMode>,
		);
	})
	.catch((err: unknown) => {
		// Config load failed – surface a plain error so it's visible in the browser
		document.body.textContent = `Failed to load configuration: ${String(err)}`;
	});
