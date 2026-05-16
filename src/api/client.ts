import { getConfig } from "@/config";
import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";

let _transport: ReturnType<typeof createConnectTransport> | null = null;

/** Returns a ConnectRPC transport whose baseUrl comes from runtime config. */
export function getTransport() {
	if (!_transport) {
		const config = getConfig();
		_transport = createConnectTransport({
			baseUrl: config.apiUrl,
			useBinaryFormat: config.grpcUseBinary,
		});
	}
	return _transport;
}

/** Resets the transport cache. Call this after loading config to ensure the transport is recreated with updated settings. */
export function resetTransport() {
	_transport = null;
}

export { createClient };
