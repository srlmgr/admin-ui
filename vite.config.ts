import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");
	const proxyTarget = env.VITE_DEV_PROXY_TARGET || "http://localhost:8080";

	return {
		test: {
			globals: true,
			environment: "jsdom",
			setupFiles: [],
		},
		plugins: [react()],
		resolve: {
			tsconfigPaths: true,
		},
		server: {
			proxy: {
				"/api": {
					target: proxyTarget,
					changeOrigin: true,
					rewrite: (path) => path.replace(/^\/api/, ""),
				},
			},
		},
	};
});
