import { getCommandClient, getQueryClient } from "@/api/grpcClients";
import type {
	Track,
	TrackLayout,
} from "@buf/srlmgr_api.bufbuild_es/backend/common/v1/common_pb";

export type CreateTrackInput = {
	name: string;
	country?: string;
	latitude?: number;
	longitude?: number;
	websiteUrl: string;
};

export type UpdateTrackInput = CreateTrackInput & {
	trackId: number;
};

export type CreateTrackLayoutInput = {
	trackId: number;
	name: string;
	lengthMeters: number;
	layoutImageUrl: string;
	simulationAliases?: SimulationAliasesInput[];
};

export type UpdateTrackLayoutInput = CreateTrackLayoutInput & {
	layoutId: number;
};

export type SimulationAliasesInput = {
	simulationId: number;
	identifiers: string[];
};

export async function listTracks(): Promise<Track[]> {
	const response = await getQueryClient().listTracks({});
	return response.items;
}

export async function getTrack(trackId: number): Promise<Track | undefined> {
	const response = await getQueryClient().getTrack({ id: trackId });
	return response.track;
}

export async function createTrack(
	input: CreateTrackInput,
): Promise<Track | undefined> {
	const response = await getCommandClient().createTrack(input);
	return response.track;
}

export async function updateTrack(
	input: UpdateTrackInput,
): Promise<Track | undefined> {
	const { trackId, ...data } = input;
	const response = await getCommandClient().updateTrack({
		trackId,
		...data,
	});
	return response.track;
}

export async function deleteTrack(trackId: number): Promise<void> {
	await getCommandClient().deleteTrack({ trackId });
}

export async function listTrackLayouts(
	trackId?: number,
): Promise<TrackLayout[]> {
	const response = await getQueryClient().listTrackLayouts(
		trackId ? { trackId } : {},
	);
	return response.items;
}

export async function getTrackLayout(layoutId: number): Promise<{
	trackLayout: TrackLayout | undefined;
	simulationAliases: SimulationAliasesInput[];
}> {
	const response = await getQueryClient().getTrackLayout({ id: layoutId });
	return {
		trackLayout: response.trackLayout,
		simulationAliases: response.simulationAliases,
	};
}

export async function createTrackLayout(
	input: CreateTrackLayoutInput,
): Promise<TrackLayout | undefined> {
	const response = await getCommandClient().createTrackLayout({
		...input,
		simulationAliases: input.simulationAliases ?? [],
	});
	return response.trackLayout;
}

export async function updateTrackLayout(
	input: UpdateTrackLayoutInput,
): Promise<TrackLayout | undefined> {
	const { layoutId, ...data } = input;
	const response = await getCommandClient().updateTrackLayout({
		trackLayoutId: layoutId,
		trackId: data.trackId,
		name: data.name,
		lengthMeters: data.lengthMeters,
		layoutImageUrl: data.layoutImageUrl,
		simulationAliases: data.simulationAliases ?? [],
	});
	return response.trackLayout;
}

export async function deleteTrackLayout(layoutId: number): Promise<void> {
	await getCommandClient().deleteTrackLayout({ trackLayoutId: layoutId });
}
