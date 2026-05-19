import react from "@vitejs/plugin-react";
import { Agent } from "http";
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
					agent: new Agent({
						keepAlive: true,
					}),
					rewrite: (path) => path.replace(/^\/api/, ""),
				},
			},
		},
	};
});
