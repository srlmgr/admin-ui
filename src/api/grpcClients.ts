import { createClient, getTransport } from "@/api/client";
import { CommandService } from "@buf/srlmgr_api.bufbuild_es/backend/command/v1/command_pb";
import { FrontendService } from "@buf/srlmgr_api.bufbuild_es/backend/query/v1/frontend_pb";
import { QueryService } from "@buf/srlmgr_api.bufbuild_es/backend/query/v1/query_pb";

let queryClient: ReturnType<typeof createClient<typeof QueryService>> | null =
	null;
let commandClient: ReturnType<
	typeof createClient<typeof CommandService>
> | null = null;
let frontendClient: ReturnType<
	typeof createClient<typeof FrontendService>
> | null = null;

export function getQueryClient() {
	if (!queryClient) {
		queryClient = createClient(QueryService, getTransport());
	}
	return queryClient;
}

export function getCommandClient() {
	if (!commandClient) {
		commandClient = createClient(CommandService, getTransport());
	}
	return commandClient;
}

export function getFrontendClient() {
	if (!frontendClient) {
		frontendClient = createClient(FrontendService, getTransport());
	}
	return frontendClient;
}
