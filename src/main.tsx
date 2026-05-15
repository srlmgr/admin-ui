import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import App from "./App.tsx";
import { loadConfig } from "./config";
import "./index.css";
import { store } from "./store";

loadConfig()
	.then(() => {
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
