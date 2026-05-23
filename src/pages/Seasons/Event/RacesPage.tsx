import {
	computeBookingEntries,
	createEventRacesAndGrids,
	deleteRace,
	getEventDriverStandings,
	getEventTeamStandings,
	listRaces,
	updateRaceName,
} from "@/api/events";
import { listSeasonEvents } from "@/api/seasons";
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
	type Driver,
	type DriverStanding,
	type Race,
	type Team,
	type TeamStanding,
} from "@buf/srlmgr_api.bufbuild_es/backend/common/v1/common_pb";
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

type DriverStandingRow = {
	key: number;
	position: number;
	name: string;
	totalPoints: number;
	bonusPoints: number;
	penaltyPoints: number;
	numWins: number;
	numPodiums: number;
};

type TeamStandingRow = {
	key: number;
	position: number;
	name: string;
	totalPoints: number;
	bonusPoints: number;
	penaltyPoints: number;
	numWins: number;
	numPodiums: number;
};

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
	const [isStandingsLoading, setIsStandingsLoading] = useState(false);
	const [driverStandings, setDriverStandings] = useState<DriverStanding[]>(
		[],
	);
	const [teamStandings, setTeamStandings] = useState<TeamStanding[]>([]);
	const [drivers, setDrivers] = useState<Driver[]>([]);
	const [teams, setTeams] = useState<Team[]>([]);
	const [summaryRefreshToken, setSummaryRefreshToken] = useState(0);

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
			setRaces(items);
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

			const eventItem = seasonEventsData.events.find(
				(item) => item.event?.id === eventId,
			);
			setResolvedEventName(eventItem?.event?.name ?? stateEventName);
		} catch (error) {
			void message.error(`Failed to load races: ${String(error)}`);
		} finally {
			setIsLoading(false);
		}
	}, [eventId, isValidEventId, isValidSeasonId, seasonId, stateEventName]);

	const loadStandings = useCallback(async () => {
		if (!isValidEventId) {
			return;
		}

		setIsStandingsLoading(true);
		try {
			const [driverStandingsResponse, teamStandingsResponse] =
				await Promise.all([
					getEventDriverStandings(eventId),
					getEventTeamStandings(eventId),
				]);

			setDriverStandings(driverStandingsResponse.standings);
			setTeamStandings(teamStandingsResponse.standings);
			setDrivers(driverStandingsResponse.drivers);
			setTeams(teamStandingsResponse.teams);
		} catch (error) {
			void message.error(`Failed to load standings: ${String(error)}`);
		} finally {
			setIsStandingsLoading(false);
		}
	}, [eventId, isValidEventId]);

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

	const driverStandingRows = useMemo<DriverStandingRow[]>(() => {
		const driverNamesById = new Map(
			drivers.map((driver) => [driver.id, driver.name]),
		);

		return [...driverStandings]
			.sort(
				(a, b) =>
					(a.data?.position ?? Number.MAX_SAFE_INTEGER) -
					(b.data?.position ?? Number.MAX_SAFE_INTEGER),
			)
			.map((standing) => ({
				key: standing.driverId,
				position: standing.data?.position ?? 0,
				name:
					driverNamesById.get(standing.driverId) ??
					`Driver #${standing.driverId}`,
				totalPoints: standing.data?.totalPoints ?? 0,
				bonusPoints: standing.data?.bonusPoints ?? 0,
				penaltyPoints: standing.data?.penaltyPoints ?? 0,
				numWins: standing.data?.numWins ?? 0,
				numPodiums: standing.data?.numPodiums ?? 0,
			}));
	}, [driverStandings, drivers]);

	const teamStandingRows = useMemo<TeamStandingRow[]>(() => {
		const teamNamesById = new Map(
			teams.map((team) => [team.id, team.name]),
		);

		return [...teamStandings]
			.sort(
				(a, b) =>
					(a.data?.position ?? Number.MAX_SAFE_INTEGER) -
					(b.data?.position ?? Number.MAX_SAFE_INTEGER),
			)
			.map((standing) => ({
				key: standing.teamId,
				position: standing.data?.position ?? 0,
				name:
					teamNamesById.get(standing.teamId) ??
					`Team #${standing.teamId}`,
				totalPoints: standing.data?.totalPoints ?? 0,
				bonusPoints: standing.data?.bonusPoints ?? 0,
				penaltyPoints: standing.data?.penaltyPoints ?? 0,
				numWins: standing.data?.numWins ?? 0,
				numPodiums: standing.data?.numPodiums ?? 0,
			}));
	}, [teamStandings, teams]);

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
								defaultActiveKey="drivers"
								items={[
									{
										key: "drivers",
										label: "Drivers",
										children: (
											<Table<DriverStandingRow>
												size="small"
												rowKey={(row) => row.key}
												loading={isStandingsLoading}
												dataSource={driverStandingRows}
												pagination={false}
												columns={[
													{
														title: "Pos",
														dataIndex: "position",
														key: "position",
														width: 80,
													},
													{
														title: "Name",
														dataIndex: "name",
														key: "name",
													},
													{
														title: "Bonus",
														dataIndex:
															"bonusPoints",
														key: "bonusPoints",
														align: "right",
													},
													{
														title: "Penalty",
														dataIndex:
															"penaltyPoints",
														key: "penaltyPoints",
														align: "right",
													},
													{
														title: "Wins",
														dataIndex: "numWins",
														key: "numWins",
														align: "right",
													},
													{
														title: "Podiums",
														dataIndex: "numPodiums",
														key: "numPodiums",
														align: "right",
													},
													{
														title: "Total",
														dataIndex:
															"totalPoints",
														key: "totalPoints",
														align: "right",
													},
												]}
												locale={{
													emptyText:
														"No driver standings",
												}}
											/>
										),
									},
									{
										key: "teams",
										label: "Teams",
										children: (
											<Table<TeamStandingRow>
												size="small"
												rowKey={(row) => row.key}
												loading={isStandingsLoading}
												dataSource={teamStandingRows}
												pagination={false}
												columns={[
													{
														title: "Pos",
														dataIndex: "position",
														key: "position",
														width: 80,
													},
													{
														title: "Name",
														dataIndex: "name",
														key: "name",
													},
													{
														title: "Bonus",
														dataIndex:
															"bonusPoints",
														key: "bonusPoints",
														align: "right",
													},
													{
														title: "Penalty",
														dataIndex:
															"penaltyPoints",
														key: "penaltyPoints",
														align: "right",
													},
													{
														title: "Wins",
														dataIndex: "numWins",
														key: "numWins",
														align: "right",
													},
													{
														title: "Podiums",
														dataIndex: "numPodiums",
														key: "numPodiums",
														align: "right",
													},
													{
														title: "Total",
														dataIndex:
															"totalPoints",
														key: "totalPoints",
														align: "right",
													},
												]}
												locale={{
													emptyText:
														"No team standings",
												}}
											/>
										),
									},
								]}
							/>
						),
					},
				]}
			/>

			<SummarySection
				scope={{ case: "eventId", value: eventId }}
				refreshToken={summaryRefreshToken}
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
