export interface AppConfig {
	/** Base URL used by the ConnectRPC transport, e.g. /api or https://api.example.com */
	apiUrl: string;
}

let _config: AppConfig | null = null;

/**
 * Loads app configuration.
 *
 * Development: reads VITE_API_URL from .env.development (Vite build-time env var).
 * Production:  fetches /config.json at runtime so Docker/K8s can inject values
 *              without a rebuild (mount a ConfigMap or bind-mount the file).
 */
export async function loadConfig(): Promise<void> {
	if (import.meta.env.DEV) {
		_config = {
			apiUrl: import.meta.env.VITE_API_URL ?? "/api",
		};
		return;
	}

	const response = await fetch("/config.json");
	if (!response.ok) {
		throw new Error(
			`Failed to load /config.json: ${response.status} ${response.statusText}`,
		);
	}
	_config = (await response.json()) as AppConfig;
}

/**
 * Returns the loaded config. Falls back to safe defaults so tests and
 * SSR-like environments work without calling loadConfig() first.
 */
export function getConfig(): AppConfig {
	return _config ?? { apiUrl: "/api" };
}
