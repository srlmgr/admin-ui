export interface AppConfig {
	/** Base URL used by the ConnectRPC transport, e.g. /api or https://api.example.com */
	apiUrl: string;
	/** When true, use binary protobuf payloads for ConnectRPC. When false, use JSON payloads. */
	grpcUseBinary: boolean;
}

function parseGrpcUseBinary(value: string | undefined): boolean {
	if (value === undefined) {
		return true;
	}
	return value.toLowerCase() === "true";
}

let _config: AppConfig | null = null;

/**
 * Loads app configuration.
 *
 * Development: reads VITE_API_URL and VITE_GRPC_USE_BINARY from .env.development (Vite build-time env vars).
 * Production:  fetches /config.json at runtime so Docker/K8s can inject values
 *              without a rebuild (mount a ConfigMap or bind-mount the file).
 */
export async function loadConfig(): Promise<void> {
	if (import.meta.env.DEV) {
		_config = {
			apiUrl: import.meta.env.VITE_API_URL ?? "/api",
			grpcUseBinary:
				import.meta.env.VITE_GRPC_USE_BINARY === undefined
					? false
					: parseGrpcUseBinary(import.meta.env.VITE_GRPC_USE_BINARY),
		};
		return;
	}

	const response = await fetch("/config.json");
	if (!response.ok) {
		throw new Error(
			`Failed to load /config.json: ${response.status} ${response.statusText}`,
		);
	}
	const config = (await response.json()) as Partial<AppConfig>;
	_config = {
		apiUrl: config.apiUrl ?? "/api",
		grpcUseBinary: config.grpcUseBinary ?? true,
	};
}

/**
 * Returns the loaded config. Falls back to safe defaults so tests and
 * SSR-like environments work without calling loadConfig() first.
 */
export function getConfig(): AppConfig {
	return _config ?? { apiUrl: "/api", grpcUseBinary: true };
}
