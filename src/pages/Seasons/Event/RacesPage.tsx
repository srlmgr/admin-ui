import { listCarClassModels } from "@/api/carClasses";
import {
	computeBookingEntries,
	createEventRacesAndGrids,
	deleteRace,
	getEventStandings,
	listRaceGrids,
	listRaces,
	updateRaceName,
} from "@/api/events";
import {
	listSeasonDrivers,
	listSeasonEvents,
	listSeasonTeams,
} from "@/api/seasons";
import { SeasonEntityBreadcrumbs } from "@/pages/Seasons/components/SeasonEntityBreadcrumbs";
import { SummarySection } from "@/pages/Seasons/Event/components/SummarySection";
import {
	ArrowLeftOutlined,
	DeleteOutlined,
	EditOutlined,
	PlusOutlined,
	ReloadOutlined,
	SettingOutlined,
} from "@ant-design/icons";
import {
	type Race,
	type RaceGrid,
} from "@buf/srlmgr_api.bufbuild_es/backend/common/v1/common_pb";
import type { Standing } from "@buf/srlmgr_api.bufbuild_es/backend/query/v1/standings_pb";
import type { Timestamp } from "@bufbuild/protobuf/wkt";
import type { TableColumnsType, TabsProps } from "antd";
import {
	Button,
	Card,
	Collapse,
	Form,
	Input,
	InputNumber,
	Modal,
	Popconfirm,
	Space,
	Table,
	Tabs,
	Typography,
	message,
} from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

type CreateRacesFormValues = {
	raceCount: number;
	gridsPerRace: number;
};

type EditRaceFormValues = {
	name: string;
};

type EventLocationState = {
	eventName?: string;
};

type StandingRow = {
	key: string;
	referenceId: number;
	carClassId: number;
	position: number;
	previousPosition: number;
	carNumber: string;
	name: string;
	carModelName: string;
	totalPoints: number;
	bonusPoints: number;
	penaltyPoints: number;
	numRaces: number;
	numWins: number;
	numTop5: number;
	numTop10: number;
};

type ParticipantInfo = {
	name: string;
	carNumber: string;
	carModelName: string;
};

type ParticipantEntry = {
	carModelId: number;
	carNumber: string;
	joinedAt?: Timestamp;
	leftAt?: Timestamp;
	comparison: [number, number, number];
};

type StandingTabDefinition = {
	key: string;
	label: string;
	rows: StandingRow[];
	isTeamTab: boolean;
};

function toTimestampSortValue(timestamp?: Timestamp): number {
	if (!timestamp) {
		return Number.MIN_SAFE_INTEGER;
	}

	return Number(timestamp.seconds ?? 0n);
}

function toTimestampComparableValue(timestamp?: Timestamp): bigint {
	if (!timestamp) {
		return 0n;
	}

	return (
		(timestamp.seconds ?? 0n) * 1000000000n + BigInt(timestamp.nanos ?? 0)
	);
}

function isWithinTimestampRange(
	eventDate: Timestamp | undefined,
	joinedAt?: Timestamp,
	leftAt?: Timestamp,
): boolean {
	if (!eventDate) {
		return true;
	}

	const eventValue = toTimestampComparableValue(eventDate);
	const isLowerBoundaryFulfilled =
		!joinedAt || eventValue >= toTimestampComparableValue(joinedAt);
	const isUpperBoundaryFulfilled =
		!leftAt || eventValue <= toTimestampComparableValue(leftAt);

	return isLowerBoundaryFulfilled && isUpperBoundaryFulfilled;
}

function entryPreferenceKey(
	leftAt?: Timestamp,
	joinedAt?: Timestamp,
	id = 0,
): [number, number, number] {
	return [leftAt ? 0 : 1, toTimestampSortValue(joinedAt), id];
}

function isCandidateBetter(
	candidate: [number, number, number],
	current: [number, number, number],
): boolean {
	if (candidate[0] !== current[0]) {
		return candidate[0] > current[0];
	}
	if (candidate[1] !== current[1]) {
		return candidate[1] > current[1];
	}
	return candidate[2] > current[2];
}

function selectPreferredEntry(
	entries: ParticipantEntry[] | undefined,
	carClassId: number,
	eventDate: Timestamp | undefined,
	carModelClassIdsByModelId: Map<number, Set<number>>,
): ParticipantEntry | undefined {
	if (!entries || entries.length === 0) {
		return undefined;
	}

	let candidates = entries;
	if (carClassId > 0) {
		const classMatchingEntries = entries.filter((entry) => {
			const classIds = carModelClassIdsByModelId.get(entry.carModelId);
			return Boolean(classIds?.has(carClassId));
		});

		if (classMatchingEntries.length > 0) {
			candidates = classMatchingEntries;
		}
	}

	const inDateRangeCandidates = candidates.filter((entry) =>
		isWithinTimestampRange(eventDate, entry.joinedAt, entry.leftAt),
	);

	const rankedCandidates =
		inDateRangeCandidates.length > 0 ? inDateRangeCandidates : candidates;

	return rankedCandidates.reduce<ParticipantEntry | undefined>(
		(best, candidate) => {
			if (!best) {
				return candidate;
			}

			return isCandidateBetter(candidate.comparison, best.comparison)
				? candidate
				: best;
		},
		undefined,
	);
}

const { Title, Text } = Typography;

export function RacesPage() {
	const navigate = useNavigate();
	const location = useLocation();
	const params = useParams();
	const seasonId = Number(params.seasonId);
	const eventId = Number(params.eventId);
	const [createForm] = Form.useForm<CreateRacesFormValues>();
	const [editRaceForm] = Form.useForm<EditRaceFormValues>();
	const [races, setRaces] = useState<Race[]>([]);
	const [raceGrids, setRaceGrids] = useState<RaceGrid[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [isCreating, setIsCreating] = useState(false);
	const [isComputing, setIsComputing] = useState(false);
	const [deletingRaceId, setDeletingRaceId] = useState<number | null>(null);
	const [editingRace, setEditingRace] = useState<Race | null>(null);
	const [isEditRaceOpen, setIsEditRaceOpen] = useState(false);
	const [isUpdatingRace, setIsUpdatingRace] = useState(false);
	const [seriesId, setSeriesId] = useState<number | null>(null);
	const [seriesName, setSeriesName] = useState<string>("");
	const [seasonName, setSeasonName] = useState<string>("");
	const [resolvedEventName, setResolvedEventName] = useState<string>("");
	const [isSeasonTeamBased, setIsSeasonTeamBased] = useState(false);
	const [isSeasonMulticlass, setIsSeasonMulticlass] = useState(false);
	const [isStandingsLoading, setIsStandingsLoading] = useState(false);
	const [primaryStandings, setPrimaryStandings] = useState<Standing[]>([]);
	const [secondaryStandings, setSecondaryStandings] = useState<Standing[]>(
		[],
	);
	const [seasonDriverItems, setSeasonDriverItems] = useState<
		Awaited<ReturnType<typeof listSeasonDrivers>>
	>([]);
	const [seasonTeamItems, setSeasonTeamItems] = useState<
		Awaited<ReturnType<typeof listSeasonTeams>>
	>([]);
	const [summaryRefreshToken, setSummaryRefreshToken] = useState(0);
	const [eventDate, setEventDate] = useState<Timestamp | undefined>(
		undefined,
	);
	const [carModelClassIdsByModelId, setCarModelClassIdsByModelId] = useState<
		Map<number, Set<number>>
	>(new Map());

	const isValidSeasonId = Number.isFinite(seasonId) && seasonId > 0;
	const isValidEventId = Number.isFinite(eventId) && eventId > 0;
	const stateEventName =
		(location.state as EventLocationState | null)?.eventName ??
		`Event #${eventId}`;
	const eventName = resolvedEventName || stateEventName;

	const loadRaces = useCallback(async () => {
		if (!isValidEventId || !isValidSeasonId) {
			return;
		}

		setIsLoading(true);
		try {
			const [items, seasonEventsData] = await Promise.all([
				listRaces(eventId),
				listSeasonEvents(seasonId),
			]);
			const raceGridItems = (
				await Promise.all(items.map((race) => listRaceGrids(race.id)))
			).flat();
			setRaces(items);
			setRaceGrids(raceGridItems);
			setSeriesId(seasonEventsData.series?.id ?? null);
			setSeriesName(
				seasonEventsData.series?.name ??
					(seasonEventsData.season?.seriesId
						? `Series #${seasonEventsData.season.seriesId}`
						: "Series"),
			);
			setSeasonName(
				seasonEventsData.season?.name ?? `Season #${seasonId}`,
			);
			setIsSeasonTeamBased(seasonEventsData.season?.isTeamBased ?? false);
			setIsSeasonMulticlass(
				seasonEventsData.season?.isMulticlass ?? false,
			);

			const eventItem = seasonEventsData.events.find(
				(item) => item.event?.id === eventId,
			);
			setResolvedEventName(eventItem?.event?.name ?? stateEventName);
			setEventDate(eventItem?.event?.eventDate);
		} catch (error) {
			void message.error(`Failed to load races: ${String(error)}`);
		} finally {
			setIsLoading(false);
		}
	}, [eventId, isValidEventId, isValidSeasonId, seasonId, stateEventName]);

	const loadStandings = useCallback(async () => {
		if (!isValidEventId || !isValidSeasonId) {
			return;
		}

		setIsStandingsLoading(true);
		try {
			const [standingsResponse, driversResponse, teamsResponse] =
				await Promise.all([
					getEventStandings(eventId),
					listSeasonDrivers(seasonId),
					listSeasonTeams(seasonId),
				]);

			const carClassIds = Array.from(
				new Set([
					...standingsResponse.primaryStandings.map(
						(item) => item.carClassId,
					),
					...standingsResponse.secondaryStandings.map(
						(item) => item.carClassId,
					),
				]),
			)
				.filter((carClassId) => carClassId > 0)
				.sort((a, b) => a - b);

			const carClassModels = await Promise.all(
				carClassIds.map(async (carClassId) => ({
					carClassId,
					models: await listCarClassModels(carClassId),
				})),
			);
			const nextCarModelClassIdsByModelId = new Map<
				number,
				Set<number>
			>();
			carClassModels.forEach(({ carClassId, models }) => {
				models.forEach((model) => {
					const existing =
						nextCarModelClassIdsByModelId.get(model.id) ??
						new Set<number>();
					existing.add(carClassId);
					nextCarModelClassIdsByModelId.set(model.id, existing);
				});
			});

			setPrimaryStandings(standingsResponse.primaryStandings);
			setSecondaryStandings(standingsResponse.secondaryStandings);
			setSeasonDriverItems(driversResponse);
			setSeasonTeamItems(teamsResponse);
			setCarModelClassIdsByModelId(nextCarModelClassIdsByModelId);
		} catch (error) {
			void message.error(`Failed to load standings: ${String(error)}`);
		} finally {
			setIsStandingsLoading(false);
		}
	}, [eventId, isValidEventId, isValidSeasonId, seasonId]);

	useEffect(() => {
		const timeoutId = window.setTimeout(() => {
			void loadRaces();
			void loadStandings();
		}, 0);

		return () => {
			window.clearTimeout(timeoutId);
		};
	}, [loadRaces, loadStandings]);

	const displayedRaces = useMemo(
		() => [...races].sort((a, b) => a.sequenceNo - b.sequenceNo),
		[races],
	);

	const resolveDriverInfo = useMemo(() => {
		const namesById = new Map<number, string>();
		const entriesByDriverId = new Map<number, ParticipantEntry[]>();
		const carModelNameById = new Map<number, string>();

		seasonDriverItems.forEach((item) => {
			item.drivers.forEach((driver) => {
				namesById.set(
					driver.id,
					driver.name.trim() || `Driver #${driver.id}`,
				);
			});

			item.carData.forEach((carDataItem) => {
				const carModelId = carDataItem.carModel?.id;
				if (!carModelId) {
					return;
				}
				carModelNameById.set(
					carModelId,
					carDataItem.carModel?.name.trim() ||
						`Car model #${carModelId}`,
				);
			});

			item.seasonDrivers.forEach((seasonDriver) => {
				const nextComparison = entryPreferenceKey(
					seasonDriver.leftAt,
					seasonDriver.joinedAt,
					seasonDriver.id,
				);

				const entries =
					entriesByDriverId.get(seasonDriver.driverId) ?? [];
				entries.push({
					carModelId: seasonDriver.carModelId,
					carNumber: seasonDriver.carNumber.trim() || "-",
					joinedAt: seasonDriver.joinedAt,
					leftAt: seasonDriver.leftAt,
					comparison: nextComparison,
				});
				entriesByDriverId.set(seasonDriver.driverId, entries);
			});
		});

		return (referenceId: number, carClassId: number): ParticipantInfo => {
			const name = namesById.get(referenceId) ?? `Driver #${referenceId}`;
			const preferred = selectPreferredEntry(
				entriesByDriverId.get(referenceId),
				carClassId,
				eventDate,
				carModelClassIdsByModelId,
			);
			const carModelName = preferred
				? (carModelNameById.get(preferred.carModelId) ??
					`Car model #${preferred.carModelId}`)
				: "-";

			return {
				name,
				carNumber: preferred?.carNumber || "-",
				carModelName,
			};
		};
	}, [carModelClassIdsByModelId, eventDate, seasonDriverItems]);

	const resolveTeamInfo = useMemo(() => {
		const namesById = new Map<number, string>();
		const entriesByTeamId = new Map<number, ParticipantEntry[]>();
		const carModelNameById = new Map<number, string>();

		seasonTeamItems.forEach((item) => {
			item.carData.forEach((carDataItem) => {
				const carModelId = carDataItem.carModel?.id;
				if (!carModelId) {
					return;
				}
				carModelNameById.set(
					carModelId,
					carDataItem.carModel?.name.trim() ||
						`Car model #${carModelId}`,
				);
			});

			item.teams.forEach((team) => {
				namesById.set(team.id, team.name.trim() || `Team #${team.id}`);

				const nextComparison = entryPreferenceKey(
					team.leftAt,
					team.joinedAt,
					team.id,
				);

				const entries = entriesByTeamId.get(team.id) ?? [];
				entries.push({
					carModelId: team.carModelId,
					carNumber: team.carNumber.trim() || "-",
					joinedAt: team.joinedAt,
					leftAt: team.leftAt,
					comparison: nextComparison,
				});
				entriesByTeamId.set(team.id, entries);
			});
		});

		return (referenceId: number, carClassId: number): ParticipantInfo => {
			const name = namesById.get(referenceId) ?? `Team #${referenceId}`;
			const preferred = selectPreferredEntry(
				entriesByTeamId.get(referenceId),
				carClassId,
				eventDate,
				carModelClassIdsByModelId,
			);
			const carModelName = preferred?.carModelId
				? (carModelNameById.get(preferred.carModelId) ??
					`Car model #${preferred.carModelId}`)
				: "-";

			return {
				name,
				carNumber: preferred?.carNumber || "-",
				carModelName,
			};
		};
	}, [carModelClassIdsByModelId, eventDate, seasonTeamItems]);

	const toStandingRows = useCallback(
		(
			standings: Standing[],
			resolveParticipantInfo: (
				referenceId: number,
				carClassId: number,
			) => ParticipantInfo,
			fallbackPrefix: string,
		): StandingRow[] =>
			[...standings]
				.sort((a, b) => {
					const byPosition =
						(a.data?.position ?? Number.MAX_SAFE_INTEGER) -
						(b.data?.position ?? Number.MAX_SAFE_INTEGER);
					if (byPosition !== 0) {
						return byPosition;
					}
					return a.referenceId - b.referenceId;
				})
				.map((standing) => {
					const info = resolveParticipantInfo(
						standing.referenceId,
						standing.carClassId,
					);
					const name =
						info?.name ??
						`${fallbackPrefix} #${standing.referenceId}`;

					return {
						key: `${standing.referenceId}-${standing.carClassId}`,
						referenceId: standing.referenceId,
						carClassId: standing.carClassId,
						position: standing.data?.position ?? 0,
						previousPosition: standing.data?.prevPosition ?? 0,
						carNumber: info?.carNumber ?? "-",
						name,
						carModelName: info?.carModelName ?? "-",
						totalPoints: standing.data?.totalPoints ?? 0,
						bonusPoints: standing.data?.bonusPoints ?? 0,
						penaltyPoints: standing.data?.penaltyPoints ?? 0,
						numRaces: standing.data?.numRaces ?? 0,
						numWins: standing.data?.numWins ?? 0,
						numTop5: standing.data?.numTop5 ?? 0,
						numTop10: standing.data?.numTop10 ?? 0,
					};
				}),
		[],
	);

	const driverStandingRows = useMemo(
		() =>
			toStandingRows(
				isSeasonTeamBased ? secondaryStandings : primaryStandings,
				resolveDriverInfo,
				"Driver",
			),
		[
			isSeasonTeamBased,
			primaryStandings,
			resolveDriverInfo,
			secondaryStandings,
			toStandingRows,
		],
	);

	const teamStandingRows = useMemo(
		() =>
			toStandingRows(
				isSeasonTeamBased ? primaryStandings : secondaryStandings,
				resolveTeamInfo,
				"Team",
			),
		[
			isSeasonTeamBased,
			primaryStandings,
			resolveTeamInfo,
			secondaryStandings,
			toStandingRows,
		],
	);

	const fullStandingColumns = useMemo<TableColumnsType<StandingRow>>(
		() => [
			{
				title: "Pos",
				dataIndex: "position",
				key: "position",
				width: 20,
			},
			{
				title: "Prev",
				dataIndex: "previousPosition",
				key: "previousPosition",
				width: 20,
			},
			{
				title: "#",
				dataIndex: "carNumber",
				key: "carNumber",
				// width: 110,
			},
			{
				title: "Name",
				dataIndex: "name",
				key: "name",
			},
			{
				title: "Car",
				dataIndex: "carModelName",
				key: "carModelName",
			},
			{
				title: "Total",
				dataIndex: "totalPoints",
				key: "totalPoints",
				align: "right",
				width: 20,
			},
			{
				title: "Penalties",
				dataIndex: "penaltyPoints",
				key: "penaltyPoints",
				align: "right",
				width: 20,
			},
			{
				title: "Bonus",
				dataIndex: "bonusPoints",
				key: "bonusPoints",
				align: "right",
				width: 20,
			},
			{
				title: "Races",
				dataIndex: "numRaces",
				key: "numRaces",
				align: "right",
				width: 20,
			},
			{
				title: "Wins",
				dataIndex: "numWins",
				key: "numWins",
				align: "right",
				width: 20,
			},
			{
				title: "T5",
				dataIndex: "numTop5",
				key: "numTop5",
				align: "right",
				width: 20,
			},
			{
				title: "T10",
				dataIndex: "numTop10",
				key: "numTop10",
				align: "right",
				width: 20,
			},
		],
		[],
	);

	const compactTeamColumns = useMemo<TableColumnsType<StandingRow>>(
		() => [
			{
				title: "Pos",
				dataIndex: "position",
				key: "position",
				width: 90,
			},
			{
				title: "Prev",
				dataIndex: "previousPosition",
				key: "previousPosition",
				width: 150,
			},
			{
				title: "Name",
				dataIndex: "name",
				key: "name",
			},
			{
				title: "Total",
				dataIndex: "totalPoints",
				key: "totalPoints",
				align: "right",
				width: 120,
			},
		],
		[],
	);

	const standingsTabItems = useMemo<TabsProps["items"]>(() => {
		const primaryLabel = isSeasonTeamBased ? "Teams" : "Drivers";
		const secondaryLabel = isSeasonTeamBased ? "Drivers" : "Teams";

		const classIds =
			isSeasonMulticlass &&
			(primaryStandings.length > 0 || secondaryStandings.length > 0)
				? Array.from(
						new Set([
							...primaryStandings.map((item) => item.carClassId),
							...secondaryStandings.map(
								(item) => item.carClassId,
							),
						]),
					).sort((a, b) => a - b)
				: [];

		const tabDefinitions: StandingTabDefinition[] = [];
		if (isSeasonMulticlass && classIds.length > 0) {
			classIds.forEach((carClassId) => {
				tabDefinitions.push({
					key: `primary-${carClassId}`,
					label: `${primaryLabel} (Class ${carClassId})`,
					rows: (isSeasonTeamBased
						? teamStandingRows
						: driverStandingRows
					).filter((row) => row.carClassId === carClassId),
					isTeamTab: isSeasonTeamBased,
				});

				tabDefinitions.push({
					key: `secondary-${carClassId}`,
					label: `${secondaryLabel} (Class ${carClassId})`,
					rows: (isSeasonTeamBased
						? driverStandingRows
						: teamStandingRows
					).filter((row) => row.carClassId === carClassId),
					isTeamTab: !isSeasonTeamBased,
				});
			});
		} else {
			tabDefinitions.push({
				key: "primary",
				label: primaryLabel,
				rows: isSeasonTeamBased ? teamStandingRows : driverStandingRows,
				isTeamTab: isSeasonTeamBased,
			});
			tabDefinitions.push({
				key: "secondary",
				label: secondaryLabel,
				rows: isSeasonTeamBased ? driverStandingRows : teamStandingRows,
				isTeamTab: !isSeasonTeamBased,
			});
		}

		return tabDefinitions.map((tab) => {
			const isCompactTeamTab = tab.isTeamTab && !isSeasonTeamBased;
			const columns = isCompactTeamTab
				? compactTeamColumns
				: fullStandingColumns;

			return {
				key: tab.key,
				label: tab.label,
				children: (
					<Table<StandingRow>
						size="small"
						rowKey={(row) => row.key}
						loading={isStandingsLoading}
						dataSource={tab.rows}
						pagination={false}
						columns={columns}
						locale={{
							emptyText: `No ${String(tab.label).toLowerCase()} standings`,
						}}
					/>
				),
			};
		});
	}, [
		compactTeamColumns,
		driverStandingRows,
		fullStandingColumns,
		isSeasonMulticlass,
		isSeasonTeamBased,
		isStandingsLoading,
		primaryStandings,
		secondaryStandings,
		teamStandingRows,
	]);

	const handleDeleteRace = useCallback(
		async (raceId: number) => {
			try {
				setDeletingRaceId(raceId);
				await deleteRace(raceId);
				void message.success("Race deleted.");
				await loadRaces();
			} catch (error) {
				void message.error(`Failed to delete race: ${String(error)}`);
			} finally {
				setDeletingRaceId(null);
			}
		},
		[loadRaces],
	);

	const handleCreateRaces = useCallback(async () => {
		if (!isValidEventId) {
			return;
		}

		try {
			const values = await createForm.validateFields();
			setIsCreating(true);
			const nextSequenceNo = races.length + 1;
			await createEventRacesAndGrids({
				eventId,
				raceCount: values.raceCount,
				gridsPerRace: values.gridsPerRace,
				startRaceSequenceNo: nextSequenceNo,
			});
			void message.success("Race events and grids created.");
			setIsCreateOpen(false);
			createForm.resetFields();
			await loadRaces();
		} catch (error) {
			if (
				typeof error === "object" &&
				error !== null &&
				"errorFields" in error
			) {
				return;
			}
			void message.error(
				`Failed to create races and grids: ${String(error)}`,
			);
		} finally {
			setIsCreating(false);
		}
	}, [createForm, eventId, isValidEventId, loadRaces, races.length]);

	const handleComputeBookingEntries = useCallback(async () => {
		if (!isValidEventId) {
			return;
		}

		try {
			setIsComputing(true);
			const createdEntries = await computeBookingEntries(eventId);
			await Promise.all([loadRaces(), loadStandings()]);
			setSummaryRefreshToken((value) => value + 1);
			void message.success(
				`Computed booking entries (${createdEntries} created).`,
			);
		} catch (error) {
			void message.error(
				`Failed to compute booking entries: ${String(error)}`,
			);
		} finally {
			setIsComputing(false);
		}
	}, [eventId, isValidEventId, loadRaces, loadStandings]);

	const openEditRaceDialog = useCallback(
		(race: Race) => {
			setEditingRace(race);
			editRaceForm.setFieldsValue({ name: race.name });
			setIsEditRaceOpen(true);
		},
		[editRaceForm],
	);

	const handleUpdateRaceName = useCallback(async () => {
		if (!editingRace) {
			return;
		}

		try {
			const values = await editRaceForm.validateFields();
			const nextName = values.name.trim();
			const currentName = editingRace.name.trim();

			if (nextName === currentName) {
				setIsEditRaceOpen(false);
				setEditingRace(null);
				editRaceForm.resetFields();
				return;
			}

			setIsUpdatingRace(true);
			await updateRaceName({
				race: editingRace,
				eventId,
				name: nextName,
			});
			void message.success("Race name updated.");
			setIsEditRaceOpen(false);
			setEditingRace(null);
			editRaceForm.resetFields();
			await loadRaces();
		} catch (error) {
			if (
				typeof error === "object" &&
				error !== null &&
				"errorFields" in error
			) {
				return;
			}
			void message.error(`Failed to update race: ${String(error)}`);
		} finally {
			setIsUpdatingRace(false);
		}
	}, [editRaceForm, editingRace, eventId, loadRaces]);

	if (!isValidSeasonId || !isValidEventId) {
		return <Text type="danger">Invalid season or event id.</Text>;
	}

	return (
		<Space orientation="vertical" size={16} style={{ width: "100%" }}>
			<SeasonEntityBreadcrumbs
				seriesId={seriesId}
				seriesName={seriesName}
				seasonId={seasonId}
				seasonName={seasonName}
				eventId={eventId}
				eventName={eventName}
			/>
			<Space>
				<Button
					icon={<ArrowLeftOutlined />}
					onClick={() => navigate(`/seasons/${seasonId}/manage`)}
				>
					Back
				</Button>
				<Title level={2} style={{ margin: 0 }}>
					Races for {eventName}
				</Title>
			</Space>

			<Card
				title="Races"
				extra={
					<Space>
						<Button
							icon={<PlusOutlined />}
							onClick={() => setIsCreateOpen(true)}
						>
							Create race events
						</Button>
						<Button
							onClick={() => void handleComputeBookingEntries()}
							loading={isComputing}
						>
							Compute
						</Button>
						<Button
							icon={<ReloadOutlined />}
							onClick={() => void loadRaces()}
							loading={isLoading}
						>
							Refresh
						</Button>
					</Space>
				}
			>
				<Table<Race>
					rowKey={(row) => row.id}
					loading={isLoading}
					dataSource={displayedRaces}
					pagination={false}
					columns={[
						{
							title: "Name",
							dataIndex: "name",
							key: "name",
						},
						{
							title: "Actions",
							key: "actions",
							render: (_, record) => (
								<Space>
									<Button
										type="text"
										icon={<EditOutlined />}
										onClick={() =>
											openEditRaceDialog(record)
										}
									>
										Edit
									</Button>
									<Button
										type="text"
										icon={<SettingOutlined />}
										onClick={() =>
											navigate(
												`/seasons/${seasonId}/events/${eventId}/races/${record.id}`,
												{
													state: {
														eventName,
														raceName: record.name,
													},
												},
											)
										}
									>
										Manage
									</Button>
									<Popconfirm
										title="Delete race"
										description={`Delete ${record.name}?`}
										onConfirm={() =>
											void handleDeleteRace(record.id)
										}
										okText="Delete"
										okButtonProps={{ danger: true }}
									>
										<Button
											type="text"
											danger
											icon={<DeleteOutlined />}
											loading={
												deletingRaceId === record.id
											}
										>
											Delete
										</Button>
									</Popconfirm>
								</Space>
							),
						},
					]}
				/>
			</Card>

			<Collapse
				defaultActiveKey={["standings"]}
				items={[
					{
						key: "standings",
						label: "Standings",
						extra: (
							<Button
								icon={<ReloadOutlined />}
								onClick={(event) => {
									event.stopPropagation();
									void loadStandings();
								}}
								loading={isStandingsLoading}
							>
								Refresh
							</Button>
						),
						children: (
							<Tabs
								defaultActiveKey={standingsTabItems?.[0]?.key}
								items={standingsTabItems}
							/>
						),
					},
				]}
			/>

			<SummarySection
				scope={{ case: "eventId", value: eventId }}
				refreshToken={summaryRefreshToken}
				races={races}
				grids={raceGrids}
			/>

			<Modal
				title="Edit race name"
				open={isEditRaceOpen}
				onCancel={() => {
					setIsEditRaceOpen(false);
					setEditingRace(null);
					editRaceForm.resetFields();
				}}
				onOk={() => void handleUpdateRaceName()}
				okText="Save"
				okButtonProps={{ loading: isUpdatingRace }}
				destroyOnHidden
			>
				<Form form={editRaceForm} layout="vertical">
					<Form.Item
						label="Race name"
						name="name"
						rules={[
							{
								required: true,
								message: "Please provide a race name",
							},
							{
								validator: async (
									_,
									value: string | undefined,
								) => {
									if (!value || value.trim().length === 0) {
										throw new Error(
											"Please provide a race name",
										);
									}
								},
							},
						]}
					>
						<Input maxLength={100} />
					</Form.Item>
				</Form>
			</Modal>

			<Modal
				title="Create race events"
				open={isCreateOpen}
				onCancel={() => {
					setIsCreateOpen(false);
					createForm.resetFields();
				}}
				onOk={() => void handleCreateRaces()}
				okText="Create"
				okButtonProps={{ loading: isCreating }}
				destroyOnHidden
			>
				<Form
					form={createForm}
					layout="vertical"
					initialValues={{ raceCount: 1, gridsPerRace: 1 }}
				>
					<Form.Item
						label="Number of races"
						name="raceCount"
						rules={[
							{
								required: true,
								message: "Please provide the number of races",
							},
							{ type: "number", min: 1, message: "Minimum is 1" },
						]}
					>
						<InputNumber
							min={1}
							precision={0}
							style={{ width: "100%" }}
						/>
					</Form.Item>
					<Form.Item
						label="Grids per race"
						name="gridsPerRace"
						rules={[
							{
								required: true,
								message:
									"Please provide the number of grids per race",
							},
							{ type: "number", min: 1, message: "Minimum is 1" },
						]}
					>
						<InputNumber
							min={1}
							precision={0}
							style={{ width: "100%" }}
						/>
					</Form.Item>
				</Form>
			</Modal>
		</Space>
	);
}
