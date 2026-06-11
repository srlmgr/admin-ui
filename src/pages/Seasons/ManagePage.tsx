import {
	deleteSeasonEvent,
	formatTimestamp,
	listSeasonEvents,
} from "@/api/seasons";
import { NewEventModal } from "@/pages/Seasons/components/NewEventModal";
import { SeasonDrivers } from "@/pages/Seasons/components/SeasonDrivers";
import { SeasonEntityBreadcrumbs } from "@/pages/Seasons/components/SeasonEntityBreadcrumbs";
import { SeasonTeams } from "@/pages/Seasons/components/SeasonTeams";
import {
	ArrowLeftOutlined,
	DeleteOutlined,
	EditOutlined,
	PlusOutlined,
	ReloadOutlined,
	SettingOutlined,
} from "@ant-design/icons";
import type { Event } from "@buf/srlmgr_api.bufbuild_es/backend/common/v1/common_pb";
import type { EventContainer } from "@buf/srlmgr_api.bufbuild_es/backend/query/v1/frontend_pb";
import {
	Button,
	Card,
	Popconfirm,
	Space,
	Table,
	Tabs,
	Typography,
	message,
} from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const { Title, Text } = Typography;

type SeasonEventRow = {
	event: Event;
	trackLabel: string;
	trackLayoutId?: number;
};

function toTrackLabel(item: EventContainer): string {
	const trackName = item.track?.name?.trim() || "-";
	const layoutName = item.trackLayout?.name?.trim() || "";

	if (layoutName === "" || layoutName.startsWith("-")) {
		return trackName;
	}

	return `${trackName} (${layoutName})`;
}

function toSeasonEventRows(items: EventContainer[]): SeasonEventRow[] {
	return items
		.filter((item): item is EventContainer & { event: Event } =>
			Boolean(item.event),
		)
		.map((item) => ({
			event: item.event,
			trackLabel: toTrackLabel(item),
			trackLayoutId: item.trackLayout?.id,
		}));
}

export function SeasonManagePage() {
	const navigate = useNavigate();
	const params = useParams();
	const seasonId = Number(params.seasonId);
	const [seriesId, setSeriesId] = useState<number | null>(null);
	const [seriesName, setSeriesName] = useState<string>("");
	const [seasonName, setSeasonName] = useState<string>("");
	const [seasonIsTeamBased, setSeasonIsTeamBased] = useState(false);
	const [events, setEvents] = useState<SeasonEventRow[]>([]);
	const [simulationId, setSimulationId] = useState<number | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [isNewEventOpen, setIsNewEventOpen] = useState(false);
	const [editingEvent, setEditingEvent] = useState<SeasonEventRow | null>(
		null,
	);
	const [deletingEventId, setDeletingEventId] = useState<number | null>(null);

	const isValidSeasonId = Number.isFinite(seasonId) && seasonId > 0;

	const loadData = useCallback(async () => {
		if (!isValidSeasonId) {
			return;
		}

		setIsLoading(true);
		try {
			const seasonEventsData = await listSeasonEvents(seasonId);
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
			setSeasonIsTeamBased(seasonEventsData.season?.isTeamBased ?? false);
			setSimulationId(seasonEventsData.series?.simulationId ?? null);
			setEvents(toSeasonEventRows(seasonEventsData.events));
		} catch (error) {
			void message.error(
				`Failed to load season events: ${String(error)}`,
			);
		} finally {
			setIsLoading(false);
		}
	}, [isValidSeasonId, seasonId]);

	const handleDeleteEvent = useCallback(
		async (eventRow: SeasonEventRow) => {
			setDeletingEventId(eventRow.event.id);
			try {
				await deleteSeasonEvent(eventRow.event.id);
				void message.success("Event deleted.");
				if (editingEvent?.event.id === eventRow.event.id) {
					setEditingEvent(null);
					setIsNewEventOpen(false);
				}
				void loadData();
			} catch (error) {
				void message.error(`Failed to delete event: ${String(error)}`);
			} finally {
				setDeletingEventId(null);
			}
		},
		[editingEvent, loadData],
	);

	useEffect(() => {
		const timeoutId = window.setTimeout(() => {
			void loadData();
		}, 0);

		return () => {
			window.clearTimeout(timeoutId);
		};
	}, [loadData]);

	const sortedEvents = useMemo(
		() =>
			[...events].sort((a, b) => a.event.sequenceNo - b.event.sequenceNo),
		[events],
	);

	const nextSequenceNo = useMemo(() => events.length + 1, [events]);

	if (!isValidSeasonId) {
		return <Text type="danger">Invalid season id.</Text>;
	}

	return (
		<Space orientation="vertical" size={16} style={{ width: "100%" }}>
			<SeasonEntityBreadcrumbs
				seriesId={seriesId}
				seriesName={seriesName}
				seasonId={seasonId}
				seasonName={seasonName}
			/>
			<Space>
				<Button
					icon={<ArrowLeftOutlined />}
					onClick={() => navigate("/seasons")}
				>
					Back
				</Button>
				<Title level={2} style={{ margin: 0 }}>
					Manage {seasonName}
				</Title>
			</Space>

			<Tabs
				items={[
					{
						key: "events",
						label: "Events",
						children: (
							<Card
								title="Season Events"
								extra={
									<Space>
										<Button
											icon={<PlusOutlined />}
											onClick={() => {
												setEditingEvent(null);
												setIsNewEventOpen(true);
											}}
											disabled={simulationId === null}
										>
											New event
										</Button>
										<Button
											icon={<ReloadOutlined />}
											onClick={() => void loadData()}
											loading={isLoading}
										>
											Refresh
										</Button>
									</Space>
								}
							>
								<Table<SeasonEventRow>
									rowKey={(row) => row.event.id}
									loading={isLoading}
									dataSource={sortedEvents}
									pagination={{
										showSizeChanger: true,
									}}
									columns={[
										{
											title: "Event Name",
											key: "name",
											render: (_, row) => row.event.name,
											sorter: (a, b) =>
												a.event.name.localeCompare(
													b.event.name,
												),
										},
										{
											title: "Event Date",
											key: "eventDate",
											render: (_, row) =>
												formatTimestamp(
													row.event.eventDate,
												),
											sorter: (a, b) =>
												Number(
													a.event.eventDate
														?.seconds ?? 0n,
												) -
												Number(
													b.event.eventDate
														?.seconds ?? 0n,
												),
										},
										{
											title: "Track",
											key: "track",
											render: (_, row) => row.trackLabel,
											sorter: (a, b) =>
												a.trackLabel.localeCompare(
													b.trackLabel,
												),
										},
										{
											title: "Actions",
											key: "actions",
											render: (_, row) => (
												<Space size={4}>
													<Button
														type="text"
														icon={<EditOutlined />}
														onClick={() =>
															setEditingEvent(row)
														}
														disabled={
															simulationId ===
															null
														}
													>
														Edit
													</Button>
													<Button
														type="text"
														icon={
															<SettingOutlined />
														}
														onClick={() =>
															navigate(
																`/seasons/${seasonId}/events/${row.event.id}`,
																{
																	state: {
																		eventName:
																			row
																				.event
																				.name,
																	},
																},
															)
														}
													>
														Manage
													</Button>
													<Popconfirm
														title="Delete event"
														description={`Delete ${row.event.name}?`}
														onConfirm={() =>
															void handleDeleteEvent(
																row,
															)
														}
														okText="Delete"
														okButtonProps={{
															danger: true,
														}}
													>
														<Button
															type="text"
															danger
															icon={
																<DeleteOutlined />
															}
															loading={
																deletingEventId ===
																row.event.id
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
						),
					},
					{
						key: "drivers",
						label: "Drivers",
						children: <SeasonDrivers seasonId={seasonId} />,
					},
					{
						key: "teams",
						label: "Teams",
						children: (
							<SeasonTeams
								seasonId={seasonId}
								isTeamBased={seasonIsTeamBased}
							/>
						),
					},
				]}
			/>

			<NewEventModal
				open={isNewEventOpen || editingEvent !== null}
				seasonId={seasonId}
				simulationId={simulationId}
				nextSequenceNo={nextSequenceNo}
				editEvent={editingEvent?.event}
				editTrackLayoutId={editingEvent?.trackLayoutId}
				onCancel={() => {
					setIsNewEventOpen(false);
					setEditingEvent(null);
				}}
				onSaved={() => {
					setIsNewEventOpen(false);
					setEditingEvent(null);
					void loadData();
				}}
			/>
		</Space>
	);
}
