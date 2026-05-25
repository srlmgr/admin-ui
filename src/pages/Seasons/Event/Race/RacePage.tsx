import {
	deleteRaceGrid,
	listRaceGrids,
	listRaces,
	updateRaceGridName,
} from "@/api/events";
import { listSeasonEvents } from "@/api/seasons";
import { SeasonEntityBreadcrumbs } from "@/pages/Seasons/components/SeasonEntityBreadcrumbs";
import { SummarySection } from "@/pages/Seasons/Event/components/SummarySection";
import {
	ArrowLeftOutlined,
	DeleteOutlined,
	EditOutlined,
	ReloadOutlined,
	SettingOutlined,
} from "@ant-design/icons";
import {
	SummaryTargetType,
	type RaceGrid,
} from "@buf/srlmgr_api.bufbuild_es/backend/common/v1/common_pb";
import {
	Button,
	Card,
	Form,
	Input,
	Modal,
	Popconfirm,
	Space,
	Table,
	Typography,
	message,
} from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

type EditGridFormValues = {
	name: string;
};

type RaceLocationState = {
	eventName?: string;
	raceName?: string;
};

const { Title, Text } = Typography;

export function RacePage() {
	const navigate = useNavigate();
	const location = useLocation();
	const params = useParams();
	const seasonId = Number(params.seasonId);
	const eventId = Number(params.eventId);
	const raceId = Number(params.raceId);
	const [grids, setGrids] = useState<RaceGrid[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [editGridForm] = Form.useForm<EditGridFormValues>();
	const [editingGrid, setEditingGrid] = useState<RaceGrid | null>(null);
	const [isEditGridOpen, setIsEditGridOpen] = useState(false);
	const [isUpdatingGrid, setIsUpdatingGrid] = useState(false);
	const [deletingGridId, setDeletingGridId] = useState<number | null>(null);
	const [seriesId, setSeriesId] = useState<number | null>(null);
	const [seriesName, setSeriesName] = useState<string>("");
	const [seasonName, setSeasonName] = useState<string>("");
	const [resolvedEventName, setResolvedEventName] = useState<string>("");
	const [resolvedRaceName, setResolvedRaceName] = useState<string>("");
	const [isSeasonTeamBased, setIsSeasonTeamBased] = useState<boolean>(false);

	const isValidSeasonId = Number.isFinite(seasonId) && seasonId > 0;
	const isValidEventId = Number.isFinite(eventId) && eventId > 0;
	const isValidRaceId = Number.isFinite(raceId) && raceId > 0;
	const state = location.state as RaceLocationState | null;
	const stateEventName = state?.eventName;
	const stateRaceName = state?.raceName;
	const eventName =
		resolvedEventName || stateEventName || `Event #${eventId}`;
	const raceName = resolvedRaceName || stateRaceName || `Race #${raceId}`;

	const loadRaceGrids = useCallback(async () => {
		if (!isValidRaceId) {
			return;
		}

		setIsLoading(true);
		try {
			const [gridItems, seasonEventsData, raceItems] = await Promise.all([
				listRaceGrids(raceId),
				listSeasonEvents(seasonId),
				listRaces(eventId),
			]);
			setGrids(gridItems);
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
			setIsSeasonTeamBased(Boolean(seasonEventsData.season?.isTeamBased));
			const eventItem = seasonEventsData.events.find(
				(item) => item.event?.id === eventId,
			);
			setResolvedEventName(
				eventItem?.event?.name ?? stateEventName ?? `Event #${eventId}`,
			);
			const raceItem = raceItems.find((item) => item.id === raceId);
			setResolvedRaceName(
				raceItem?.name ?? stateRaceName ?? `Race #${raceId}`,
			);
		} catch (error) {
			void message.error(`Failed to load grids: ${String(error)}`);
		} finally {
			setIsLoading(false);
		}
	}, [
		eventId,
		isValidRaceId,
		raceId,
		seasonId,
		stateEventName,
		stateRaceName,
	]);

	useEffect(() => {
		const timeoutId = window.setTimeout(() => {
			void loadRaceGrids();
		}, 0);

		return () => {
			window.clearTimeout(timeoutId);
		};
	}, [loadRaceGrids]);

	const displayedGrids = useMemo(
		() => [...grids].sort((a, b) => a.sequenceNo - b.sequenceNo),
		[grids],
	);

	const openEditGridDialog = useCallback(
		(grid: RaceGrid) => {
			setEditingGrid(grid);
			editGridForm.setFieldsValue({ name: grid.name });
			setIsEditGridOpen(true);
		},
		[editGridForm],
	);

	const handleUpdateGridName = useCallback(async () => {
		if (!editingGrid) {
			return;
		}

		try {
			const values = await editGridForm.validateFields();
			const nextName = values.name.trim();
			const currentName = editingGrid.name.trim();

			if (nextName === currentName) {
				setIsEditGridOpen(false);
				setEditingGrid(null);
				editGridForm.resetFields();
				return;
			}

			setIsUpdatingGrid(true);
			await updateRaceGridName({
				raceGrid: editingGrid,
				name: nextName,
			});
			void message.success("Grid name updated.");
			setIsEditGridOpen(false);
			setEditingGrid(null);
			editGridForm.resetFields();
			await loadRaceGrids();
		} catch (error) {
			if (
				typeof error === "object" &&
				error !== null &&
				"errorFields" in error
			) {
				return;
			}
			void message.error(`Failed to update grid: ${String(error)}`);
		} finally {
			setIsUpdatingGrid(false);
		}
	}, [editGridForm, editingGrid, loadRaceGrids]);

	const handleDeleteGrid = useCallback(
		async (grid: RaceGrid) => {
			setDeletingGridId(grid.id);
			try {
				await deleteRaceGrid(grid.id);
				void message.success("Grid deleted.");
				await loadRaceGrids();
			} catch (error) {
				void message.error(`Failed to delete grid: ${String(error)}`);
			} finally {
				setDeletingGridId(null);
			}
		},
		[loadRaceGrids],
	);

	if (!isValidSeasonId || !isValidEventId || !isValidRaceId) {
		return <Text type="danger">Invalid season, event, or race id.</Text>;
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
			/>
			<Space>
				<Button
					icon={<ArrowLeftOutlined />}
					onClick={() =>
						navigate(`/seasons/${seasonId}/events/${eventId}`, {
							state: { eventName },
						})
					}
				>
					Back
				</Button>
				<Title level={2} style={{ margin: 0 }}>
					Grids for {raceName}
				</Title>
			</Space>

			<Card
				title="Race Grids"
				extra={
					<Button
						icon={<ReloadOutlined />}
						onClick={() => void loadRaceGrids()}
						loading={isLoading}
					>
						Refresh
					</Button>
				}
			>
				<Table<RaceGrid>
					rowKey={(row) => row.id}
					loading={isLoading}
					dataSource={displayedGrids}
					pagination={false}
					columns={[
						{
							title: "Name",
							dataIndex: "name",
							key: "name",
							render: (_, record) => record.name,
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
											openEditGridDialog(record)
										}
									>
										Edit
									</Button>
									<Button
										type="text"
										icon={<SettingOutlined />}
										onClick={() =>
											navigate(
												`/seasons/${seasonId}/events/${eventId}/races/${raceId}/grids/${record.id}`,
												{
													state: {
														gridName: record.name,
													},
												},
											)
										}
									>
										Manage
									</Button>

									<Popconfirm
										title="Delete grid"
										description={`Delete ${record.name}?`}
										onConfirm={() =>
											void handleDeleteGrid(record)
										}
										okText="Delete"
										okButtonProps={{ danger: true }}
									>
										<Button
											type="text"
											danger
											icon={<DeleteOutlined />}
											loading={
												deletingGridId === record.id
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

			<SummarySection
				scope={{ case: "raceId", value: raceId }}
				summaryTargetType={
					isSeasonTeamBased
						? SummaryTargetType.TEAM
						: SummaryTargetType.DRIVER
				}
			/>

			<Modal
				title="Edit grid name"
				open={isEditGridOpen}
				onCancel={() => {
					setIsEditGridOpen(false);
					setEditingGrid(null);
					editGridForm.resetFields();
				}}
				onOk={() => void handleUpdateGridName()}
				okText="Save"
				okButtonProps={{ loading: isUpdatingGrid }}
				destroyOnHidden
			>
				<Form form={editGridForm} layout="vertical">
					<Form.Item
						label="Grid name"
						name="name"
						rules={[
							{
								required: true,
								message: "Please provide a grid name",
							},
							{
								validator: async (
									_,
									value: string | undefined,
								) => {
									if (!value || value.trim().length === 0) {
										throw new Error(
											"Please provide a grid name",
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
		</Space>
	);
}
