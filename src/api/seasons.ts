import {
	getCommandClient,
	getFrontendClient,
	getQueryClient,
} from "@/api/grpcClients";
import { SeasonCarModelsUpdateMode } from "@buf/srlmgr_api.bufbuild_es/backend/command/v1/command_pb";
import type {
	CarClass,
	CarModelVariant,
	Event,
	PointSystem,
	Season,
	Series,
	Team,
	TeamMember,
} from "@buf/srlmgr_api.bufbuild_es/backend/common/v1/common_pb";
import {
	EventProcessingState,
	EventStatus,
} from "@buf/srlmgr_api.bufbuild_es/backend/common/v1/common_pb";
import type {
	EventContainer,
	SeasonDriverContainer,
	SeasonTeamContainer,
	TrackLayoutContainer,
} from "@buf/srlmgr_api.bufbuild_es/backend/query/v1/frontend_pb";
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

export type SeasonEventsData = {
	season?: Season;
	series?: Series;
	events: EventContainer[];
};

export async function listSeasonEvents(
	seasonId: number,
): Promise<SeasonEventsData> {
	const response = await getFrontendClient().listSeasonEvents({ seasonId });
	return {
		season: response.season,
		series: response.series,
		events: response.events,
	};
}

export async function listSeasonDrivers(
	seasonId: number,
): Promise<SeasonDriverContainer[]> {
	const response = await getFrontendClient().listSeasonDrivers({ seasonId });
	return response.items;
}

export async function listSeasonTeams(
	seasonId: number,
): Promise<SeasonTeamContainer[]> {
	const response = await getFrontendClient().listSeasonTeams({ seasonId });
	return response.items;
}

export async function listSeasonCarModelVariants(
	seasonId: number,
): Promise<CarModelVariant[]> {
	const response = await getFrontendClient().listSeasonCarModelVariants({
		seasonId,
	});
	return response.items;
}

export async function listSeasonCarClasses(
	seasonId: number,
): Promise<CarClass[]> {
	const response = await getFrontendClient().listSeasonCarClasses({
		seasonId,
	});
	return response.items;
}

export async function setSeasonCarModelVariants(
	seasonId: number,
	carModelVariantIds: number[],
): Promise<void> {
	await getCommandClient().setSeasonCarModelVariants({
		seasonId,
		carModelVariantIds,
	});
}

export async function setSeasonCarClasses(
	seasonId: number,
	carClassIds: number[],
): Promise<void> {
	await getCommandClient().setSeasonCarClasses({
		seasonId,
		carClassIds,
		updateMode: SeasonCarModelsUpdateMode.REPLACE,
	});
}

export type AddSeasonDriverInput = {
	seasonId: number;
	driverId: number;
	carModelVariantId: number | string;
	carNumber: string;
	joinedAt?: Date;
};

function toRequiredUInt32(value: number | string, fieldName: string): number {
	const normalized =
		typeof value === "number" ? value : Number.parseInt(value, 10);

	if (!Number.isInteger(normalized) || normalized < 0) {
		throw new Error(`${fieldName} must be a non-negative integer`);
	}

	return normalized;
}

//seems to be unused....
export async function addSeasonDriver(
	input: AddSeasonDriverInput,
): Promise<void> {
	await getCommandClient().addSeasonDriver({
		seasonId: input.seasonId,
		driverId: input.driverId,
		carModelVariantId: toRequiredUInt32(
			input.carModelVariantId,
			"carModelVariantId",
		),
		carNumber: input.carNumber,
		joinedAt: input.joinedAt ? dateToTimestamp(input.joinedAt) : undefined,
	});
}

export async function deleteSeasonDriverEntry(id: number): Promise<void> {
	await getCommandClient().deleteSeasonDriver({ id });
}

export type UpsertSeasonTeamInput = {
	seasonId: number;
	name: string;
	isActive: boolean;
	carModelId?: number | string;
	carNumber?: string;
	joinedAt?: Date;
	leftAt?: Date;
};

function toUInt32OrUndefined(value?: number | string): number | undefined {
	if (value === undefined || value === null || value === "") {
		return undefined;
	}

	const numericValue =
		typeof value === "number" ? value : Number.parseInt(value, 10);

	if (!Number.isInteger(numericValue) || numericValue < 0) {
		return undefined;
	}

	return numericValue;
}

export async function createSeasonTeam(
	input: UpsertSeasonTeamInput,
): Promise<Team | undefined> {
	type CreateTeamPayload = Parameters<
		ReturnType<typeof getCommandClient>["createTeam"]
	>[0];
	const payload: CreateTeamPayload = {
		seasonId: input.seasonId,
		name: input.name,
		isActive: input.isActive,
	};

	if (input.joinedAt) {
		(payload as unknown as Record<string, unknown>).joinedAt =
			dateToTimestamp(input.joinedAt);
	}

	if (input.carModelId) {
		const normalizedCarModelId = toUInt32OrUndefined(input.carModelId);
		if (normalizedCarModelId !== undefined) {
			(payload as unknown as Record<string, unknown>).carModelId =
				normalizedCarModelId;
		}
	}
	if (input.carNumber) {
		(payload as unknown as Record<string, unknown>).carNumber =
			input.carNumber.trim();
	}

	const response = await getCommandClient().createTeam(payload);
	return response.team;
}

export async function updateSeasonTeam(
	teamId: number,
	input: UpsertSeasonTeamInput,
): Promise<Team | undefined> {
	type UpdateTeamPayload = Parameters<
		ReturnType<typeof getCommandClient>["updateTeam"]
	>[0];
	const payload: UpdateTeamPayload = {
		teamId,
		seasonId: input.seasonId,
		name: input.name,
		isActive: input.isActive,
	};

	if (input.joinedAt) {
		(payload as unknown as Record<string, unknown>).joinedAt =
			dateToTimestamp(input.joinedAt);
	}
	if (input.leftAt) {
		(payload as unknown as Record<string, unknown>).leftAt =
			dateToTimestamp(input.leftAt);
	}

	if (input.carModelId) {
		const normalizedCarModelId = toUInt32OrUndefined(input.carModelId);
		if (normalizedCarModelId !== undefined) {
			(payload as unknown as Record<string, unknown>).carModelId =
				normalizedCarModelId;
		}
	}
	if (input.carNumber) {
		(payload as unknown as Record<string, unknown>).carNumber =
			input.carNumber.trim();
	}

	const response = await getCommandClient().updateTeam(payload);
	return response.team;
}

export async function deleteSeasonTeam(teamId: number): Promise<boolean> {
	const response = await getCommandClient().deleteTeam({ teamId });
	return response.deleted;
}

export async function addTeamMember(
	teamId: number,
	driverId: number,
	options?: {
		joinedAt?: Date;
		leftAt?: Date;
	},
): Promise<void> {
	type AddTeamMemberPayload = Parameters<
		ReturnType<typeof getCommandClient>["addTeamMember"]
	>[0];
	const payload: AddTeamMemberPayload = {
		teamId,
		driverId,
		joinedAt: options?.joinedAt
			? dateToTimestamp(options.joinedAt)
			: undefined,
		leftAt: options?.leftAt ? dateToTimestamp(options.leftAt) : undefined,
	};

	await getCommandClient().addTeamMember(payload);
}

export async function removeTeamMember(id: number): Promise<void> {
	await getCommandClient().removeTeamMember({ id });
}

export async function deleteTeamMember(id: number): Promise<void> {
	await getCommandClient().deleteTeamMember({ id });
}

export async function listTeamMembers(teamId: number): Promise<TeamMember[]> {
	const response = await getQueryClient().getTeamMembers({ id: teamId });
	return response.members;
}

export type SeasonDriverEntry = {
	driverId: number;
	carModelId: number | string;
	carNumber: string;
	isGuestDriver: boolean;
	joinedAt?: Date;
	leftAt?: Date;
};

export async function setSeasonDrivers(
	seasonId: number,
	entries: SeasonDriverEntry[],
): Promise<void> {
	await getCommandClient().setSeasonDrivers({
		seasonId,
		drivers: entries.map((e) => ({
			driverId: e.driverId,
			carModelId: toRequiredUInt32(e.carModelId, "carModelId"),
			carNumber: e.carNumber,
			isGuestDriver: e.isGuestDriver,
			joinedAt: e.joinedAt ? dateToTimestamp(e.joinedAt) : undefined,
			leftAt: e.leftAt ? dateToTimestamp(e.leftAt) : undefined,
		})),
	});
}

export async function listTrackLayoutsForSimulation(
	simulationId: number,
): Promise<TrackLayoutContainer[]> {
	const response = await getFrontendClient().listTrackLayouts({
		simulationId,
	});
	return response.items;
}

function dateToTimestamp(date: Date): Timestamp {
	const ms = date.getTime();
	return create(TimestampSchema, {
		seconds: BigInt(Math.floor(ms / 1000)),
		nanos: (ms % 1000) * 1_000_000,
	});
}

export type CreateSeasonEventInput = {
	seasonId: number;
	trackLayoutId: number;
	name: string;
	sequenceNo: number;
	eventDate: Date;
};

export type UpdateSeasonEventInput = CreateSeasonEventInput & {
	eventId: number;
	status: EventStatus;
	processingState: EventProcessingState;
};

export async function createSeasonEvent(
	input: CreateSeasonEventInput,
): Promise<Event | undefined> {
	const response = await getCommandClient().createEvent({
		seasonId: input.seasonId,
		trackLayoutId: input.trackLayoutId,
		name: input.name,
		sequenceNo: input.sequenceNo,
		eventDate: dateToTimestamp(input.eventDate),
		status: EventStatus.SCHEDULED,
		processingState: EventProcessingState.DRAFT,
	});

	return response.event;
}

export async function updateSeasonEvent(
	input: UpdateSeasonEventInput,
): Promise<Event | undefined> {
	const response = await getCommandClient().updateEvent({
		eventId: input.eventId,
		seasonId: input.seasonId,
		trackLayoutId: input.trackLayoutId,
		name: input.name,
		sequenceNo: input.sequenceNo,
		eventDate: dateToTimestamp(input.eventDate),
		status: input.status,
		processingState: input.processingState,
	});

	return response.event;
}

export async function deleteSeasonEvent(eventId: number): Promise<void> {
	await getCommandClient().deleteEvent({ eventId });
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
