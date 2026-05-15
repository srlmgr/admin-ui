import { getConfig } from "@/config";
import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";

let _transport: ReturnType<typeof createConnectTransport> | null = null;

/** Returns a ConnectRPC transport whose baseUrl comes from runtime config. */
export function getTransport() {
	if (!_transport) {
		_transport = createConnectTransport({ baseUrl: getConfig().apiUrl });
	}
	return _transport;
}

export { createClient };
