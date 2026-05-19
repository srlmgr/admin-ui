import { getCommandClient, getQueryClient } from "@/api/grpcClients";
import type {
	CarBrand,
	CarManufacturer,
	CarModel,
} from "@buf/srlmgr_api.bufbuild_es/backend/common/v1/common_pb";

export type UpsertCarManufacturerInput = {
	name: string;
};

export type UpsertCarBrandInput = {
	manufacturerId: number;
	name: string;
};

export type SimulationAliasesInput = {
	simulationId: number;
	identifiers: string[];
};

export type UpsertCarModelInput = {
	brandId: number;
	name: string;
	simulationAliases: SimulationAliasesInput[];
};

export async function listCarManufacturers(): Promise<CarManufacturer[]> {
	const response = await getQueryClient().listCarManufacturers({});
	return response.items;
}

export async function createCarManufacturer(
	input: UpsertCarManufacturerInput,
): Promise<CarManufacturer | undefined> {
	const response = await getCommandClient().createCarManufacturer({
		name: input.name,
	});
	return response.carManufacturer;
}

export async function updateCarManufacturer(
	carManufacturerId: number,
	input: UpsertCarManufacturerInput,
): Promise<CarManufacturer | undefined> {
	const response = await getCommandClient().updateCarManufacturer({
		carManufacturerId,
		name: input.name,
	});
	return response.carManufacturer;
}

export async function deleteCarManufacturer(
	carManufacturerId: number,
): Promise<boolean> {
	const response = await getCommandClient().deleteCarManufacturer({
		carManufacturerId,
	});
	return response.deleted;
}

export async function listCarBrands(
	manufacturerId: number,
): Promise<CarBrand[]> {
	const request: Record<string, unknown> = {
		manufacturerId,
		manufacturer_id: manufacturerId,
	};
	const response = await getQueryClient().listCarBrands(request as never);
	return response.items;
}

export async function createCarBrand(
	input: UpsertCarBrandInput,
): Promise<CarBrand | undefined> {
	const response = await getCommandClient().createCarBrand({
		manufacturerId: input.manufacturerId,
		name: input.name,
	});
	return response.carBrand;
}

export async function updateCarBrand(
	carBrandId: number,
	input: UpsertCarBrandInput,
): Promise<CarBrand | undefined> {
	const response = await getCommandClient().updateCarBrand({
		carBrandId,
		manufacturerId: input.manufacturerId,
		name: input.name,
	});
	return response.carBrand;
}

export async function deleteCarBrand(carBrandId: number): Promise<boolean> {
	const response = await getCommandClient().deleteCarBrand({
		carBrandId,
	});
	return response.deleted;
}

export async function listCarModels(
	manufacturerId: number,
): Promise<CarModel[]> {
	const request: Record<string, unknown> = {
		manufacturerId,
		manufacturer_id: manufacturerId,
	};
	const response = await getQueryClient().listCarModels(request as never);
	return response.items;
}

export async function getCarModel(carModelId: number): Promise<{
	carModel: CarModel | undefined;
	simulationAliases: SimulationAliasesInput[];
}> {
	const response = await getQueryClient().getCarModel({ id: carModelId });
	const simulationAliases = (
		response as unknown as {
			simulationAliases?: SimulationAliasesInput[];
			simulation_aliases?: SimulationAliasesInput[];
		}
	).simulationAliases;
	const simulationAliasesLegacy = (
		response as unknown as {
			simulation_aliases?: SimulationAliasesInput[];
		}
	).simulation_aliases;

	return {
		carModel: response.carModel,
		simulationAliases: simulationAliases ?? simulationAliasesLegacy ?? [],
	};
}

export async function createCarModel(
	input: UpsertCarModelInput,
): Promise<CarModel | undefined> {
	const response = await getCommandClient().createCarModel({
		brandId: input.brandId,
		name: input.name,
		simulationAliases: input.simulationAliases,
	});
	return response.carModel;
}

export async function updateCarModel(
	carModelId: number,
	input: UpsertCarModelInput,
): Promise<CarModel | undefined> {
	const response = await getCommandClient().updateCarModel({
		carModelId,
		brandId: input.brandId,
		name: input.name,
		simulationAliases: input.simulationAliases,
	});
	return response.carModel;
}

export async function deleteCarModel(carModelId: number): Promise<boolean> {
	const response = await getCommandClient().deleteCarModel({
		carModelId,
	});
	return response.deleted;
}
