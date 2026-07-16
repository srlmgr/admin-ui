import { getCommandClient, getQueryClient } from "@/api/grpcClients";
import type {
	CarClass,
	CarModelVariant,
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

export async function listCarClassModelVariants(
	carClassId: number,
): Promise<CarModelVariant[]> {
	const response = await getQueryClient().listCarClassModelVariants({
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

export async function assignCarModelVariantToCarClass(
	carClassId: number,
	carModelVariantId: number,
): Promise<void> {
	await getCommandClient().assignCarModelVariantToCarClass({
		carClassId,
		carModelVariantId,
	});
}

export async function unassignCarModelVariantFromCarClass(
	carClassId: number,
	carModelVariantId: number,
): Promise<void> {
	await getCommandClient().unassignCarModelVariantFromCarClass({
		carClassId,
		carModelVariantId,
	});
}
