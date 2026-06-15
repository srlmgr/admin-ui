import { getCommandClient, getQueryClient } from "@/api/grpcClients";
import type {
	CarClass,
	CarModel,
} from "@buf/srlmgr_api.bufbuild_es/backend/common/v1/common_pb";

export type UpsertCarClassInput = {
	name: string;
};

export async function listCarClasses(): Promise<CarClass[]> {
	const response = await getQueryClient().listCarClasses({});
	return response.items;
}

export async function getCarClass(
	carClassId: number,
): Promise<CarClass | undefined> {
	const response = await getQueryClient().getCarClass({ id: carClassId });
	return response.carClass;
}

export async function listCarClassModels(
	carClassId: number,
): Promise<CarModel[]> {
	const response = await getQueryClient().listCarClassModels({
		classId: carClassId,
	});
	return response.items;
}

export async function createCarClass(
	input: UpsertCarClassInput,
): Promise<CarClass | undefined> {
	const response = await getCommandClient().createCarClass({
		name: input.name,
	});
	return response.carClass;
}

export async function updateCarClass(
	carClassId: number,
	input: UpsertCarClassInput,
): Promise<CarClass | undefined> {
	const response = await getCommandClient().updateCarClass({
		carClassId,
		name: input.name,
	});
	return response.carClass;
}

export async function deleteCarClass(carClassId: number): Promise<boolean> {
	const response = await getCommandClient().deleteCarClass({
		carClassId,
	});
	return response.deleted;
}

export async function assignCarModelToCarClass(
	carClassId: number,
	carModelId: number,
): Promise<void> {
	await getCommandClient().assignCarModelToCarClass({
		carClassId,
		carModelId,
	});
}

export async function unassignCarModelFromCarClass(
	carClassId: number,
	carModelId: number,
): Promise<void> {
	await getCommandClient().unassignCarModelFromCarClass({
		carClassId,
		carModelId,
	});
}
