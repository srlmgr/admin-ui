import {
	getCommandClient,
	getImportClient,
	getQueryClient,
} from "@/api/grpcClients";
import { getConfig } from "@/config";
import {
	RaceSessionType,
	SummaryTargetType,
	type Race,
	type RaceGrid,
	type ResultEntry,
} from "@buf/srlmgr_api.bufbuild_es/backend/common/v1/common_pb";
import type { GetPreprocessPreviewResponse } from "@buf/srlmgr_api.bufbuild_es/backend/import/v1/import_pb";
import {
	type AddPenaltyRequest,
	type DeletePenaltyRequest,
	type PenaltyTarget,
} from "@buf/srlmgr_api.bufbuild_es/backend/import/v1/import_pb";
import type {
	GetDriverStandingsResponse,
	GetSummaryResponse,
	GetTeamStandingsResponse,
} from "@buf/srlmgr_api.bufbuild_es/backend/query/v1/query_pb";

export async function listRaces(eventId: number): Promise<Race[]> {
	const response = await getQueryClient().listRaces({ eventId });
	return response.items;
}

export async function listRaceGrids(raceId: number): Promise<RaceGrid[]> {
	const response = await getQueryClient().listRaceGrids({ raceId });
	return response.items;
}

export async function getEventSummary(
	eventId: number,
	type: SummaryTargetType,
): Promise<GetSummaryResponse> {
	return getQueryClient().getSummary({
		selector: {
			scope: { case: "eventId", value: eventId },
			type,
		},
	});
}

export async function getRaceSummary(
	raceId: number,
	type: SummaryTargetType,
): Promise<GetSummaryResponse> {
	return getQueryClient().getSummary({
		selector: {
			scope: { case: "raceId", value: raceId },
			type,
		},
	});
}

export async function getEventDriverStandings(
	eventId: number,
): Promise<GetDriverStandingsResponse> {
	return getQueryClient().getDriverStandings({ eventId });
}

export async function getEventTeamStandings(
	eventId: number,
): Promise<GetTeamStandingsResponse> {
	return getQueryClient().getTeamStandings({ eventId });
}

export async function deleteRace(raceId: number): Promise<void> {
	await getCommandClient().deleteRace({ raceId });
}

export async function deleteRaceGrid(raceGridId: number): Promise<void> {
	await getCommandClient().deleteRaceGrid({ raceGridId });
}

export async function updateRaceName(input: {
	race: Race;
	eventId: number;
	name: string;
}): Promise<void> {
	await getCommandClient().updateRace({
		raceId: input.race.id,
		eventId: input.eventId,
		name: input.name,
		sessionType: input.race.sessionType,
		sequenceNo: input.race.sequenceNo,
	});
}

export async function updateRaceGridName(input: {
	raceGrid: RaceGrid;
	name: string;
}): Promise<void> {
	await getCommandClient().updateRaceGrid({
		raceGridId: input.raceGrid.id,
		name: input.name,
		sessionType: input.raceGrid.sessionType,
		sequenceNo: input.raceGrid.sequenceNo,
	});
}

export type CreateEventRacesInput = {
	eventId: number;
	raceCount: number;
	gridsPerRace: number;
	startRaceSequenceNo?: number; // Optional parameter to specify the starting sequence number
};

export async function createEventRacesAndGrids(
	input: CreateEventRacesInput,
): Promise<void> {
	const startSequenceNo = input.startRaceSequenceNo ?? 1; // Default to 1 if not provided

	for (
		let raceSequenceNo = startSequenceNo;
		raceSequenceNo < startSequenceNo + input.raceCount;
		raceSequenceNo += 1
	) {
		const raceResponse = await getCommandClient().createRace({
			eventId: input.eventId,
			name: `Rennen ${raceSequenceNo}`,
			sessionType: RaceSessionType.RACE,
			sequenceNo: raceSequenceNo,
		});

		if (!raceResponse.race) {
			throw new Error(`Backend did not return race ${raceSequenceNo}`);
		}

		for (
			let gridSequenceNo = 1;
			gridSequenceNo <= input.gridsPerRace;
			gridSequenceNo += 1
		) {
			await getCommandClient().createRaceGrid({
				raceId: raceResponse.race.id,
				name: `Grid ${gridSequenceNo}`,
				sessionType: RaceSessionType.RACE,
				sequenceNo: gridSequenceNo,
			});
		}
	}
}

export async function getPreprocessPreview(input: {
	gridId: number;
}): Promise<GetPreprocessPreviewResponse> {
	const response = await getImportClient().getPreprocessPreview({
		raceGridId: input.gridId,
	});
	return response;
}

export async function resolveMappings(input: {
	gridId: number;
}): Promise<number> {
	const response = await getImportClient().resolveMappings({
		raceGridId: input.gridId,
	});
	return response.unresolvedMappings;
}

export async function applyRaceGridResultEdits(input: {
	gridId: number;
	editedRows: ResultEntry[];
}): Promise<void> {
	await getImportClient().applyResultEdits({
		raceGridId: input.gridId,
		editedRows: input.editedRows,
	});
}

export type AddPenaltyInput = {
	scope:
		| { case: "eventId"; value: number }
		| { case: "raceId"; value: number }
		| { case: "raceGridId"; value: number };
	target:
		| { case: "driverId"; value: number }
		| { case: "teamId"; value: number };
	penaltyPoints: number;
	reason: string;
};

export async function addPenalty(input: AddPenaltyInput): Promise<void> {
	const target: PenaltyTarget = {
		scope: input.scope,
		target: input.target,
	};

	const payload: AddPenaltyRequest = {
		target,
		penaltyPoints: input.penaltyPoints,
		reason: input.reason,
	};

	await getImportClient().addPenalty(payload);
}

export async function deletePenalty(penaltyId: number): Promise<void> {
	const payload: DeletePenaltyRequest = {
		penaltyId,
	};

	await getImportClient().deletePenalty(payload);
}

export async function computeBookingEntries(eventId: number): Promise<number> {
	const response = await getImportClient().computeBookingEntries({ eventId });
	return response.createdEntries;
}

export async function uploadGridResults(
	gridId: number,
	files: File[],
): Promise<void> {
	const { apiUrl } = getConfig();
	const url = `${apiUrl}/upload/${gridId}`;
	const body = new FormData();
	for (const file of files) {
		body.append("file", file);
	}
	const response = await fetch(url, {
		method: "POST",
		body,
		credentials: "include",
	});
	if (!response.ok) {
		const text = await response.text().catch(() => response.statusText);
		throw new Error(`Upload failed (${response.status}): ${text}`);
	}
}
