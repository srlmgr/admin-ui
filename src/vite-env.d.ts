/// <reference types="vite/client" />

interface ImportMetaEnv {
	/** Base URL for the API, e.g. /api. Used in development via .env.development */
	readonly VITE_API_URL: string;
	/**
	 * Controls ConnectRPC wire format.
	 * true  => protobuf binary
	 * false => JSON
	 */
	readonly VITE_GRPC_USE_BINARY: "true" | "false";
	/** Proxy target for the Vite dev server, e.g. http://localhost:8080 */
	readonly VITE_DEV_PROXY_TARGET: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
