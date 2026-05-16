import { createClient, getTransport } from "@/api/client";
import { CommandService } from "@buf/srlmgr_api.bufbuild_es/backend/command/v1/command_pb";
import {
	ImportFormat,
	type ImportConfig,
	type Simulation,
} from "@buf/srlmgr_api.bufbuild_es/backend/common/v1/common_pb";
import { QueryService } from "@buf/srlmgr_api.bufbuild_es/backend/query/v1/query_pb";

// Create clients lazily to ensure getTransport() is called after config is loaded
let queryClient: ReturnType<typeof createClient<typeof QueryService>> | null =
	null;
let commandClient: ReturnType<
	typeof createClient<typeof CommandService>
> | null = null;

function getQueryClient() {
	if (!queryClient) {
		queryClient = createClient(QueryService, getTransport());
	}
	return queryClient;
}

function getCommandClient() {
	if (!commandClient) {
		commandClient = createClient(CommandService, getTransport());
	}
	return commandClient;
}

export type SimulationImportConfigInput = Pick<
	ImportConfig,
	"format" | "allowMultipleUploads"
>;

export type UpsertSimulationInput = {
	name: string;
	isActive: boolean;
	supportedFormats: SimulationImportConfigInput[];
};

export async function listSimulations(): Promise<Simulation[]> {
	const response = await getQueryClient().listSimulations({});
	return response.items;
}

export async function createSimulation(
	input: UpsertSimulationInput,
): Promise<Simulation | undefined> {
	const response = await getCommandClient().createSimulation({
		name: input.name,
		isActive: input.isActive,
		supportedFormats: input.supportedFormats,
	});

	return response.simulation;
}

export async function updateSimulation(
	simulationId: number,
	input: UpsertSimulationInput,
): Promise<Simulation | undefined> {
	const response = await getCommandClient().updateSimulation({
		simulationId,
		name: input.name,
		isActive: input.isActive,
		supportedFormats: input.supportedFormats,
	});

	return response.simulation;
}

export async function deleteSimulation(simulationId: number): Promise<boolean> {
	const response = await getCommandClient().deleteSimulation({
		simulationId,
	});
	return response.deleted;
}

export const AVAILABLE_IMPORT_FORMATS = [
	{ value: ImportFormat.JSON, label: "JSON" },
	{ value: ImportFormat.CSV, label: "CSV" },
	{ value: ImportFormat.XML, label: "XML" },
];
