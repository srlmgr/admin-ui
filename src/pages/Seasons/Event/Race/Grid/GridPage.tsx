import {
	applyRaceGridResultEdits,
	getPreprocessPreview,
	listRaceGrids,
	listRaces,
	resolveMappings,
	uploadGridResults,
} from "@/api/events";
import { listSeasonEvents } from "@/api/seasons";
import { SeasonEntityBreadcrumbs } from "@/pages/Seasons/components/SeasonEntityBreadcrumbs";
import { BookingEntriesTable } from "@/pages/Seasons/Event/components/BookingEntriesTable";
import { EditResultRowModal } from "@/pages/Seasons/Event/Race/Grid/EditResultRowModal";
import {
	ArrowLeftOutlined,
	DeleteOutlined,
	EditOutlined,
	UploadOutlined,
} from "@ant-design/icons";
import {
	ResultEntryState,
	type ResultEntry,
	type UnresolvedMapping,
} from "@buf/srlmgr_api.bufbuild_es/backend/common/v1/common_pb";
import type { GetPreprocessPreviewResponse } from "@buf/srlmgr_api.bufbuild_es/backend/import/v1/import_pb";
import {
	Button,
	Card,
	message,
	Popconfirm,
	Space,
	Table,
	Typography,
	Upload,
} from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

const { Title } = Typography;

type GridLocationState = {
	gridName?: string;
};

function formatDurationFromMs(value: number): string {
	if (!Number.isFinite(value) || value < 0) {
		return String(value);
	}

	const totalMilliseconds = Math.floor(value);
	const totalSeconds = Math.floor(totalMilliseconds / 1000);
	const milliseconds = totalMilliseconds % 1000;
	const seconds = totalSeconds % 60;
	const totalMinutes = Math.floor(totalSeconds / 60);
	const minutes = totalMinutes % 60;
	const hours = Math.floor(totalMinutes / 60);

	const mm = String(minutes).padStart(2, "0");
	const ss = String(seconds).padStart(2, "0");
	const sss = String(milliseconds).padStart(3, "0");

	if (hours > 0) {
		const hh = String(hours).padStart(2, "0");
		return `${hh}:${mm}:${ss}.${sss}`;
	}

	return `${mm}:${ss}.${sss}`;
}

function getDistinctUnresolvedMappings(
	unresolvedMappings: UnresolvedMapping[],
): UnresolvedMapping[] {
	const uniqueMappings = new Map<string, UnresolvedMapping>();
	for (const item of unresolvedMappings) {
		const key = `${item.mappingType}\u0000${item.sourceValue}`;
		if (!uniqueMappings.has(key)) {
			uniqueMappings.set(key, item);
		}
	}
	return Array.from(uniqueMappings.values());
}

export function GridPage() {
	const navigate = useNavigate();
	const location = useLocation();
	const params = useParams();
	const seasonId = Number(params.seasonId);
	const eventId = Number(params.eventId);
	const raceId = Number(params.raceId);
	const gridId = Number(params.gridId);
	const [preview, setPreview] = useState<GetPreprocessPreviewResponse | null>(
		null,
	);
	const [isLoading, setIsLoading] = useState(false);
	const [seriesId, setSeriesId] = useState<number | null>(null);
	const [seriesName, setSeriesName] = useState<string>("");
	const [seasonName, setSeasonName] = useState<string>("");
	const [isSeasonTeamBased, setIsSeasonTeamBased] = useState(false);
	const [eventName, setEventName] = useState<string>("");
	const [raceName, setRaceName] = useState<string>("");
	const [gridName, setGridName] = useState<string>("");
	const [deletingRowId, setDeletingRowId] = useState<number | null>(null);
	const [editingRow, setEditingRow] = useState<ResultEntry | null>(null);
	const [isSavingEdit, setIsSavingEdit] = useState(false);
	const [isValidating, setIsValidating] = useState(false);
	const [unresolvedMappingsData, setUnresolvedMappingsData] = useState<
		UnresolvedMapping[]
	>([]);

	const isValidSeasonId = Number.isFinite(seasonId) && seasonId > 0;
	const isValidEventId = Number.isFinite(eventId) && eventId > 0;
	const isValidRaceId = Number.isFinite(raceId) && raceId > 0;
	const isValidGridId = Number.isFinite(gridId) && gridId > 0;
	const state = location.state as GridLocationState | null;
	const stateGridName = state?.gridName;

	const loadResults = useCallback(async () => {
		if (
			!isValidSeasonId ||
			!isValidEventId ||
			!isValidRaceId ||
			!isValidGridId
		) {
			return;
		}

		setIsLoading(true);
		try {
			const [nextPreview, seasonEventsData, raceItems, gridItems] =
				await Promise.all([
					getPreprocessPreview({ gridId }),
					listSeasonEvents(seasonId),
					listRaces(eventId),
					listRaceGrids(raceId),
				]);
			setPreview(nextPreview);
			setUnresolvedMappingsData(
				getDistinctUnresolvedMappings(nextPreview.unresolvedMappings),
			);
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
			const eventItem = seasonEventsData.events.find(
				(item) => item.event?.id === eventId,
			);
			setEventName(eventItem?.event?.name ?? `Event #${eventId}`);
			const raceItem = raceItems.find((item) => item.id === raceId);
			setRaceName(raceItem?.name ?? `Race #${raceId}`);
			const gridItem = gridItems.find((item) => item.id === gridId);
			setGridName(gridItem?.name ?? stateGridName ?? `Grid #${gridId}`);
		} catch (error) {
			void message.error(`Failed to load results: ${String(error)}`);
		} finally {
			setIsLoading(false);
		}
	}, [
		eventId,
		gridId,
		isValidEventId,
		isValidGridId,
		isValidRaceId,
		isValidSeasonId,
		raceId,
		seasonId,
		stateGridName,
	]);

	const results: ResultEntry[] = useMemo(
		() => preview?.rows ?? [],
		[preview],
	);

	const unresolvedMappings: UnresolvedMapping[] = useMemo(
		() => unresolvedMappingsData,
		[unresolvedMappingsData],
	);

	const handleDeleteRow = useCallback(
		async (row: ResultEntry) => {
			if (!isValidGridId) {
				return;
			}

			setDeletingRowId(row.id);
			try {
				const remainingRows = results.filter(
					(item) => item.id !== row.id,
				);
				await applyRaceGridResultEdits({
					gridId,
					editedRows: remainingRows,
				});
				void message.success("Result row deleted");
				await loadResults();
			} catch (error) {
				void message.error(
					`Failed to delete result row: ${String(error)}`,
				);
			} finally {
				setDeletingRowId(null);
			}
		},
		[gridId, isValidGridId, loadResults, results],
	);

	const handleEditRow = useCallback((row: ResultEntry) => {
		setEditingRow(row);
	}, []);

	const handleCancelEdit = useCallback(() => {
		setEditingRow(null);
	}, []);

	const handleSaveRow = useCallback(
		async (updatedRow: ResultEntry) => {
			if (!isValidGridId) {
				return;
			}

			setIsSavingEdit(true);
			try {
				const editedRows = results.map((row) =>
					row.id === updatedRow.id ? updatedRow : row,
				);
				await applyRaceGridResultEdits({
					gridId,
					editedRows,
				});
				void message.success("Result row updated");
				setEditingRow(null);
				await loadResults();
			} catch (error) {
				void message.error(
					`Failed to update result row: ${String(error)}`,
				);
			} finally {
				setIsSavingEdit(false);
			}
		},
		[gridId, isValidGridId, loadResults, results],
	);

	const handleValidate = useCallback(async () => {
		if (!isValidGridId) {
			return;
		}

		setIsValidating(true);
		setUnresolvedMappingsData([]);
		try {
			await resolveMappings({ gridId });
			const nextPreview = await getPreprocessPreview({ gridId });
			setPreview(nextPreview);
			setUnresolvedMappingsData(
				getDistinctUnresolvedMappings(nextPreview.unresolvedMappings),
			);
			void message.success("Validation completed");
		} catch (error) {
			void message.error(`Validation failed: ${String(error)}`);
		} finally {
			setIsValidating(false);
		}
	}, [gridId, isValidGridId]);

	const resultColumns = useMemo(() => {
		const compareNumber = (
			a: ResultEntry,
			b: ResultEntry,
			selector: (row: ResultEntry) => number,
		) => selector(a) - selector(b);

		return [
			{
				title: "Pos",
				dataIndex: "finishingPosition",
				key: "finishingPosition",
				align: "right" as const,
				fixed: "left" as const,
				sorter: (a: ResultEntry, b: ResultEntry) =>
					compareNumber(a, b, (row) => row.finishingPosition),
				defaultSortOrder: "ascend" as const,
				// width: 20,
			},
			{
				title: "#",
				dataIndex: "carNumber",
				key: "carNumber",
				align: "right" as const,
				fixed: "left" as const,
				// width: 30,
			},

			{
				title: "Entry",
				key: "entry",
				align: "left" as const,
				fixed: "left" as const,
				width: 170,
				ellipsis: true,
				render: (_: unknown, row: ResultEntry) =>
					isSeasonTeamBased ? row.rawTeamName : row.rawDriverName,
			},
			{
				title: "Start",
				dataIndex: "startingPosition",
				key: "startingPosition",
				align: "right" as const,
				sorter: (a: ResultEntry, b: ResultEntry) =>
					compareNumber(a, b, (row) => row.startingPosition),
				// width: 74,
			},
			{
				title: "Laps",
				dataIndex: "completedLaps",
				key: "completedLaps",
				align: "right" as const,
				// width: 74,
			},
			{
				title: "Quali",
				dataIndex: "qualiTimeMs",
				key: "qualiTimeMs",
				align: "right" as const,
				// width: 96,
				render: (value: number) => formatDurationFromMs(value),
			},
			{
				title: "Fastest",
				dataIndex: "fastestLapTimeMs",
				key: "fastestLapTimeMs",
				align: "right" as const,
				sorter: (a: ResultEntry, b: ResultEntry) =>
					compareNumber(a, b, (row) => row.fastestLapTimeMs),
				// width: 108,
				render: (value: number) => formatDurationFromMs(value),
			},
			{
				title: "Inc",
				dataIndex: "incidents",
				key: "incidents",
				align: "right" as const,
				sorter: (a: ResultEntry, b: ResultEntry) => {
					const byIncidents = compareNumber(
						a,
						b,
						(row) => row.incidents,
					);
					if (byIncidents !== 0) {
						return byIncidents;
					}

					return compareNumber(a, b, (row) => row.finishingPosition);
				},
				// width: 64,
			},
			{
				title: "Total",
				dataIndex: "totalTimeMs",
				key: "totalTimeMs",
				align: "right" as const,
				// width: 96,
				render: (value: number) => formatDurationFromMs(value),
			},
			// {
			// 	title: "State",
			// 	dataIndex: "state",
			// 	key: "state",
			// 	align: "right" as const,
			// 	// width: 102,
			// 	render: (state: ResultEntry["state"]) =>
			// 		ResultEntryState[state] ?? String(state),
			// },
			{
				title: "Admin Notes",
				dataIndex: "adminNotes",
				key: "adminNotes",
				align: "left" as const,
				width: 180,
				ellipsis: true,
			},

			{
				title: "Guest",
				dataIndex: "isGuestDriver",
				key: "isGuestDriver",
				align: "right" as const,
				width: 76,
				render: (isGuestDriver: boolean) =>
					isGuestDriver ? "Yes" : "No",
			},
			{
				title: "Actions",
				key: "actions",
				fixed: "right" as const,
				width: 170,
				render: (_: unknown, row: ResultEntry) => (
					<Space size={2}>
						<Button
							type="text"
							size="small"
							icon={<EditOutlined />}
							onClick={() => handleEditRow(row)}
						>
							Edit
						</Button>
						<Popconfirm
							title="Delete result row"
							description={`Delete ${row.rawDriverName || "this row"}?`}
							onConfirm={() => void handleDeleteRow(row)}
							okText="Delete"
							okButtonProps={{ danger: true }}
						>
							<Button
								type="text"
								danger
								size="small"
								icon={<DeleteOutlined />}
								loading={deletingRowId === row.id}
							>
								Delete
							</Button>
						</Popconfirm>
					</Space>
				),
			},
		];
	}, [deletingRowId, handleDeleteRow, handleEditRow, isSeasonTeamBased]);

	const unresolvedMappingColumns = useMemo(
		() => [
			{
				title: "Mapping Type",
				dataIndex: "mappingType",
				key: "mappingType",
				align: "left" as const,
				sorter: (a: UnresolvedMapping, b: UnresolvedMapping) =>
					a.mappingType.localeCompare(b.mappingType),
				defaultSortOrder: "ascend" as const,
			},
			{
				title: "Source Value",
				dataIndex: "sourceValue",
				key: "sourceValue",
				align: "left" as const,
			},
		],
		[],
	);

	useEffect(() => {
		const fetchResults = async () => {
			try {
				await loadResults();
			} catch (error) {
				void message.error(`Failed to load results: ${String(error)}`);
			}
		};

		void fetchResults();
	}, [loadResults]);

	if (
		!isValidSeasonId ||
		!isValidEventId ||
		!isValidRaceId ||
		!isValidGridId
	) {
		return (
			<Typography.Text type="danger">
				Invalid season, event, race, or grid ID.
			</Typography.Text>
		);
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
				raceId={raceId}
				raceName={raceName}
				gridId={gridId}
				gridName={gridName}
			/>
			<Space>
				<Button
					icon={<ArrowLeftOutlined />}
					onClick={() => navigate(-1)}
				>
					Back
				</Button>
				<Title level={2} style={{ margin: 0 }}>
					Manage Grid
				</Title>
			</Space>

			<Card
				title="Actions"
				extra={
					<Space>
						<Button
							loading={isValidating}
							onClick={() => void handleValidate()}
						>
							Validate
						</Button>
						<Upload
							multiple
							showUploadList={false}
							beforeUpload={async (file, fileList) => {
								if (file.uid !== fileList[0]?.uid) {
									return Upload.LIST_IGNORE;
								}

								try {
									const files = fileList.map(
										(item) => item as unknown as File,
									);
									await uploadGridResults(gridId, files);
									void message.success(
										`Uploaded ${files.length} file${files.length === 1 ? "" : "s"}`,
									);
									await loadResults();
								} catch (error) {
									void message.error(
										`Upload failed: ${String(error)}`,
									);
								}

								return Upload.LIST_IGNORE;
							}}
						>
							<Button icon={<UploadOutlined />}>
								Upload results
							</Button>
						</Upload>
					</Space>
				}
			>
				{unresolvedMappings.length > 0 ? (
					<>
						<Title level={4}>Unresolved entities</Title>
						<Table<UnresolvedMapping>
							size="small"
							rowKey={(row, index) =>
								`${row.mappingType}-${row.sourceValue}-${String(index)}`
							}
							loading={isLoading}
							dataSource={unresolvedMappings}
							pagination={false}
							columns={unresolvedMappingColumns}
							style={{ marginBottom: 16 }}
						/>
					</>
				) : null}
				<Table<ResultEntry>
					className="grid-page-results-table"
					size="small"
					rowKey={(row) => row.id}
					rowClassName={(row) =>
						row.state !== ResultEntryState.NORMAL
							? "grid-row-state-warning"
							: ""
					}
					loading={isLoading}
					dataSource={results}
					pagination={false}
					columns={resultColumns}
					scroll={{ x: "max-content" }}
				/>
				<EditResultRowModal
					open={editingRow !== null}
					row={editingRow}
					isSaving={isSavingEdit}
					onCancel={handleCancelEdit}
					onSubmit={handleSaveRow}
				/>
			</Card>

			<Card title="Booking entries">
				<BookingEntriesTable
					scope={{ case: "gridId", value: gridId }}
				/>
			</Card>
		</Space>
	);
}
