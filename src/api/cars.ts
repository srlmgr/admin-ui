import { getCommandClient, getQueryClient } from "@/api/grpcClients";
import type {
	CarManufacturer,
	CarModel,
	CarModelVariant,
} from "@buf/srlmgr_api.bufbuild_es/backend/common/v1/common_pb";

export type UpsertCarManufacturerInput = {
	name: string;
};

export type UpsertCarModelInput = {
	manufacturerId: number;
	name: string;
};

export type SimulationAliasesInput = {
	simulationId: number;
	identifiers: string[];
};

export type UpsertCarModelVariantInput = {
	modelId: number;
	name: string;
	simulationAliases: SimulationAliasesInput[];
};

export async function listCarManufacturers(): Promise<CarManufacturer[]> {
	const response = await getQueryClient().listCarManufacturers({});
	return response.items;
}

export type CarModelOption = {
	carModelId: number;
	label: string;
};

export async function listAllCarModelOptions(): Promise<CarModelOption[]> {
	const models = await listCarModels(0);
	return models
		.map((m) => ({ carModelId: m.id, label: m.name }))
		.sort((a, b) => a.label.localeCompare(b.label));
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

export async function listCarModels(
	manufacturerId: number,
): Promise<CarModel[]> {
	const response = await getQueryClient().listCarModels({
		manufacturerId,
	});
	return response.items;
}

export async function getCarModel(
	carModelId: number,
): Promise<CarModel | undefined> {
	const response = await getQueryClient().getCarModel({ id: carModelId });
	return response.carModel;
}

export async function createCarModel(
	input: UpsertCarModelInput,
): Promise<CarModel | undefined> {
	const response = await getCommandClient().createCarModel({
		manufacturerId: input.manufacturerId,
		name: input.name,
	});
	return response.carModel;
}

export async function updateCarModel(
	carModelId: number,
	input: UpsertCarModelInput,
): Promise<CarModel | undefined> {
	const response = await getCommandClient().updateCarModel({
		carModelId,
		manufacturerId: input.manufacturerId,
		name: input.name,
	});
	return response.carModel;
}

export async function deleteCarModel(carModelId: number): Promise<boolean> {
	const response = await getCommandClient().deleteCarModel({
		carModelId,
	});
	return response.deleted;
}

export async function listCarModelVariants(
	modelId: number,
): Promise<CarModelVariant[]> {
	const response = await getQueryClient().listCarModelVariants({
		modelId,
	});
	return response.items;
}
export async function listAllCarModelVariants(): Promise<CarModelVariant[]> {
	const response = await getQueryClient().listCarModelVariants({});
	return response.items;
}

export async function getCarModelVariant(carModelVariantId: number): Promise<{
	carModelVariant: CarModelVariant | undefined;
	simulationAliases: SimulationAliasesInput[];
}> {
	const response = await getQueryClient().getCarModelVariant({
		id: carModelVariantId,
	});

	return {
		carModelVariant: response.carModelVariant,
		simulationAliases: response.simulationAliases,
	};
}

export async function createCarModelVariant(
	input: UpsertCarModelVariantInput,
): Promise<CarModelVariant | undefined> {
	const response = await getCommandClient().createCarModelVariant({
		modelId: input.modelId,
		name: input.name,
		simulationAliases: input.simulationAliases,
	});
	return response.carModelVariant;
}

export async function updateCarModelVariant(
	carModelVariantId: number,
	input: UpsertCarModelVariantInput,
): Promise<CarModelVariant | undefined> {
	const response = await getCommandClient().updateCarModelVariant({
		carModelVariantId,
		modelId: input.modelId,
		name: input.name,
		simulationAliases: input.simulationAliases,
	});
	return response.carModelVariant;
}

export async function deleteCarModelVariant(
	carModelVariantId: number,
): Promise<boolean> {
	const response = await getCommandClient().deleteCarModelVariant({
		carModelVariantId,
	});
	return response.deleted;
}
