/// <reference types="vite/client" />

interface ImportMetaEnv {
	/** Base URL for the API, e.g. /api. Used in development via .env.development */
	readonly VITE_API_URL: string;
	/** Polling interval in seconds for /currentuser refreshes after successful auth bootstrap. */
	readonly VITE_CURRENT_USER_POLL_SECONDS?: string;
	/**
	 * Controls ConnectRPC wire format.
	 * true  => protobuf binary
	 * false => JSON
	 */
	readonly VITE_GRPC_USE_BINARY: "true" | "false";
	/** Proxy target for the Vite dev server, e.g. http://localhost:8080 */
	readonly VITE_DEV_PROXY_TARGET: string;
	/** Application version injected at build time (e.g. git tag). Defaults to "dev". */
	readonly VITE_APP_VERSION?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
