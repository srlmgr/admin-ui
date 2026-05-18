import {
	getCommandClient,
	getFrontendClient,
	getQueryClient,
} from "@/api/grpcClients";
import type {
	Event,
	PointSystem,
	Season,
} from "@buf/srlmgr_api.bufbuild_es/backend/common/v1/common_pb";
import { create } from "@bufbuild/protobuf";
import { TimestampSchema, type Timestamp } from "@bufbuild/protobuf/wkt";

export type SeasonOverviewItem = {
	season: Season;
	seriesName: string;
	simulationName: string;
};

export type UpsertSeasonInput = {
	seriesId: number;
	name: string;
	pointSystemId: number;
	skipEvents: number;
	hasTeams: boolean;
	isTeamBased: boolean;
	teamPointsTopN: number;
	isMulticlass: boolean;
	startsAt?: string;
	endsAt?: string;
};

function dateInputToTimestamp(dateInput?: string): Timestamp | undefined {
	if (!dateInput) {
		return undefined;
	}

	const date = new Date(`${dateInput}T00:00:00Z`);
	if (Number.isNaN(date.getTime())) {
		return undefined;
	}

	return create(TimestampSchema, {
		seconds: BigInt(Math.floor(date.getTime() / 1000)),
		nanos: 0,
	});
}

function timestampToDateInput(timestamp?: Timestamp): string {
	if (!timestamp) {
		return "";
	}

	const seconds = Number(timestamp.seconds ?? 0);
	if (!Number.isFinite(seconds)) {
		return "";
	}

	return new Date(seconds * 1000).toISOString().slice(0, 10);
}

export function formatTimestamp(timestamp?: Timestamp): string {
	if (!timestamp) {
		return "-";
	}

	const seconds = Number(timestamp.seconds ?? 0);
	if (!Number.isFinite(seconds)) {
		return "-";
	}

	return new Date(seconds * 1000).toLocaleDateString();
}

export async function listSeasonsOverview(): Promise<SeasonOverviewItem[]> {
	const response = await getFrontendClient().listSeasonsOverview({
		includeInactive: false,
	});

	const seriesById = new Map(response.series.map((item) => [item.id, item]));
	const simulationById = new Map(
		response.simulations.map((item) => [item.id, item]),
	);

	return response.seasons.map((season) => {
		const series = seriesById.get(season.seriesId);
		const simulation = series
			? simulationById.get(series.simulationId)
			: undefined;
		return {
			season,
			seriesName: series?.name ?? "Unknown series",
			simulationName: simulation?.name ?? "Unknown simulation",
		};
	});
}

export async function listPointSystems(): Promise<PointSystem[]> {
	const response = await getQueryClient().listPointSystems({});
	return response.items;
}

export async function getSeason(seasonId: number): Promise<Season | undefined> {
	const response = await getQueryClient().getSeason({ id: seasonId });
	return response.season;
}

export async function listSeasonEvents(seasonId: number): Promise<Event[]> {
	const response = await getQueryClient().listEvents({ seasonId });
	return response.items;
}

export async function createSeason(
	input: UpsertSeasonInput,
): Promise<Season | undefined> {
	const response = await getCommandClient().createSeason({
		seriesId: input.seriesId,
		name: input.name,
		pointSystemId: input.pointSystemId,
		skipEvents: input.skipEvents,
		hasTeams: input.hasTeams,
		isTeamBased: input.isTeamBased,
		teamPointsTopN: input.teamPointsTopN,
		isMulticlass: input.isMulticlass,
		status: "active",
		startsAt: dateInputToTimestamp(input.startsAt),
		endsAt: dateInputToTimestamp(input.endsAt),
	});
	return response.season;
}

export async function updateSeason(
	seasonId: number,
	input: UpsertSeasonInput,
): Promise<Season | undefined> {
	const response = await getCommandClient().updateSeason({
		seasonId,
		name: input.name,
		pointSystemId: input.pointSystemId,
		skipEvents: input.skipEvents,
		hasTeams: input.hasTeams,
		isTeamBased: input.isTeamBased,
		teamPointsTopN: input.teamPointsTopN,
		isMulticlass: input.isMulticlass,
		status: "active",
		startsAt: dateInputToTimestamp(input.startsAt),
		endsAt: dateInputToTimestamp(input.endsAt),
	});
	return response.season;
}

export async function deleteSeason(seasonId: number): Promise<boolean> {
	const response = await getCommandClient().deleteSeason({ seasonId });
	return response.deleted;
}

export type SeasonFormValues = {
	name: string;
	pointSystemId: number;
	skipEvents: number;
	hasTeams: boolean;
	isTeamBased: boolean;
	teamPointsTopN: number;
	isMulticlass: boolean;
	startsAt: string;
	endsAt: string;
};

export function seasonToFormValues(season: Season): SeasonFormValues {
	return {
		name: season.name,
		pointSystemId: season.pointSystemId,
		skipEvents: season.skipEvents,
		hasTeams: season.hasTeams,
		isTeamBased: season.isTeamBased,
		teamPointsTopN: season.teamPointsTopN,
		isMulticlass: season.isMulticlass,
		startsAt: timestampToDateInput(season.startsAt),
		endsAt: timestampToDateInput(season.endsAt),
	};
}
