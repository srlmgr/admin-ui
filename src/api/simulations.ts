import { getCommandClient, getQueryClient } from "@/api/grpcClients";
import {
	ImportFormat,
	type ImportConfig,
	type Simulation,
} from "@buf/srlmgr_api.bufbuild_es/backend/common/v1/common_pb";

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
