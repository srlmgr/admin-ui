import { getCommandClient, getQueryClient } from "@/api/grpcClients";
import type { Driver } from "@buf/srlmgr_api.bufbuild_es/backend/common/v1/common_pb";

export type UpsertDriverInput = {
	name: string;
	externalId: string;
	isActive: boolean;
};

export type SimulationAliasInput = {
	simulationId: number;
	simulationDriverId: string[];
};

export async function listDrivers(): Promise<Driver[]> {
	const response = await getQueryClient().listDrivers({});
	return response.items;
}

export async function getDriver(
	driverId: number,
	includeAliases = true,
): Promise<{ driver?: Driver; aliases: SimulationAliasInput[] }> {
	const request: Record<string, unknown> = { id: driverId };
	if (includeAliases) {
		// Accept both field name variants while generated typings catch up.
		request.includeAliases = true;
		request.include_aliases = true;
	}
	console.log(
		"Requesting driver with ID:",
		driverId,
		"Include aliases:",
		includeAliases,
	);
	const response = await getQueryClient().getDriver(request as never);
	const aliases = (
		response as unknown as { aliases?: SimulationAliasInput[] }
	).aliases;

	return {
		driver: response.driver,
		aliases: aliases ?? [],
	};
}

export async function createDriver(
	input: UpsertDriverInput,
): Promise<Driver | undefined> {
	const response = await getCommandClient().createDriver({
		name: input.name,
		externalId: input.externalId,
		isActive: input.isActive,
	});
	return response.driver;
}

export async function updateDriver(
	driverId: number,
	input: UpsertDriverInput,
): Promise<Driver | undefined> {
	const response = await getCommandClient().updateDriver({
		driverId,
		name: input.name,
		externalId: input.externalId,
		isActive: input.isActive,
	});
	return response.driver;
}

export async function deleteDriver(driverId: number): Promise<boolean> {
	const response = await getCommandClient().deleteDriver({ driverId });
	return response.deleted;
}

export async function setSimulationDriverAliases(
	driverId: number,
	simulationId: number,
	simulationDriverId: string[],
): Promise<boolean> {
	const response = await getCommandClient().setSimulationDriverAliases({
		driverId,
		simulationId,
		simulationDriverId,
	});
	return response.updated;
}
