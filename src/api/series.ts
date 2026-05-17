import { getCommandClient, getQueryClient } from "@/api/grpcClients";
import type { Series } from "@buf/srlmgr_api.bufbuild_es/backend/common/v1/common_pb";

export type UpsertSeriesInput = {
	simulationId: number;
	name: string;
	description: string;
	isActive: boolean;
};

export async function listSeries(simulationId: number): Promise<Series[]> {
	const response = await getQueryClient().listSeries({ simulationId });
	return response.items;
}

export async function createSeries(
	input: UpsertSeriesInput,
): Promise<Series | undefined> {
	const response = await getCommandClient().createSeries({
		simulationId: input.simulationId,
		name: input.name,
		description: input.description,
		isActive: input.isActive,
	});

	return response.series;
}

export async function updateSeries(
	seriesId: number,
	input: UpsertSeriesInput,
): Promise<Series | undefined> {
	const response = await getCommandClient().updateSeries({
		seriesId,
		simulationId: input.simulationId,
		name: input.name,
		description: input.description,
		isActive: input.isActive,
	});

	return response.series;
}

export async function deleteSeries(seriesId: number): Promise<boolean> {
	const response = await getCommandClient().deleteSeries({ seriesId });
	return response.deleted;
}
