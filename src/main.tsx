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

async function bootstrapAuth() {
	store.dispatch(setLoading(true));

	try {
		const { status, user } = await fetchCurrentUser();

		if (status === 200 && user) {
			store.dispatch(setUser(user));
			return true;
		}

		store.dispatch(clearUser());

		if (window.location.pathname !== "/login") {
			window.location.replace("/login");
			return false;
		}

		return true;
	} catch {
		store.dispatch(clearUser());

		if (window.location.pathname !== "/login") {
			window.location.replace("/login");
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
