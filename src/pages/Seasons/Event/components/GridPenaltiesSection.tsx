import { getBookingEntries, type BookingEntriesScope } from "@/api/bookings";
import { addPenalty, deletePenalty } from "@/api/events";
import { listSeasonDrivers, listSeasonTeams } from "@/api/seasons";
import {
	DeleteOutlined,
	PlusOutlined,
	ReloadOutlined,
} from "@ant-design/icons";
import {
	BookingSourceType,
	BookingTargetType,
	type BookingEntry,
	type Driver,
	type Team,
} from "@buf/srlmgr_api.bufbuild_es/backend/common/v1/common_pb";
import type { TableColumnsType } from "antd";
import {
	Button,
	Card,
	Form,
	Input,
	InputNumber,
	Modal,
	Popconfirm,
	Select,
	Space,
	Table,
	message,
} from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";

type GridPenaltiesSectionProps = {
	scope: BookingEntriesScope;
	seasonId: number;
	isSeasonTeamBased: boolean;
};

type PenaltyFormValues = {
	targetId: number;
	penaltyPoints: number;
	reason: string;
};

type PenaltyRow = BookingEntry & {
	targetName: string;
	penaltyPoints: number;
};

function formatEnumLabel(value: string): string {
	return value
		.toLowerCase()
		.split("_")
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}

function getBookingTargetTypeLabel(value: BookingTargetType): string {
	return BookingTargetType[value]
		? formatEnumLabel(BookingTargetType[value])
		: String(value);
}

function getPenaltyTargetName(
	entry: BookingEntry,
	driversById: Map<number, Driver>,
	teamsById: Map<number, Team>,
): string {
	if (entry.targetType === BookingTargetType.DRIVER) {
		return (
			driversById.get(entry.targetId)?.name ?? `Driver #${entry.targetId}`
		);
	}

	if (entry.targetType === BookingTargetType.TEAM) {
		return teamsById.get(entry.targetId)?.name ?? `Team #${entry.targetId}`;
	}

	return `Target #${entry.targetId}`;
}

function buildDriverOptions(items: Driver[]): {
	value: number;
	label: string;
}[] {
	const labelsById = new Map<number, string>();
	for (const driver of items) {
		labelsById.set(
			driver.id,
			driver.name?.trim() || `Driver #${driver.id}`,
		);
	}

	return [...labelsById.entries()]
		.map(([value, label]) => ({ value, label }))
		.sort((a, b) => a.label.localeCompare(b.label));
}

function buildTeamOptions(items: Team[]): { value: number; label: string }[] {
	const labelsById = new Map<number, string>();
	for (const team of items) {
		labelsById.set(team.id, team.name?.trim() || `Team #${team.id}`);
	}

	return [...labelsById.entries()]
		.map(([value, label]) => ({ value, label }))
		.sort((a, b) => a.label.localeCompare(b.label));
}

export function GridPenaltiesSection({
	scope,
	seasonId,
	isSeasonTeamBased,
}: GridPenaltiesSectionProps) {
	const [form] = Form.useForm<PenaltyFormValues>();
	const [bookingEntries, setBookingEntries] = useState<BookingEntry[]>([]);
	const [drivers, setDrivers] = useState<Driver[]>([]);
	const [teams, setTeams] = useState<Team[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [deletingPenaltyId, setDeletingPenaltyId] = useState<number | null>(
		null,
	);

	const loadPenalties = useCallback(async () => {
		setIsLoading(true);
		try {
			const [bookingResponse, seasonDrivers, seasonTeams] =
				await Promise.all([
					getBookingEntries(scope),
					listSeasonDrivers(seasonId),
					listSeasonTeams(seasonId),
				]);
			setBookingEntries(bookingResponse.items);
			setDrivers(seasonDrivers.flatMap((item) => item.drivers));
			setTeams(seasonTeams.flatMap((item) => item.teams));
		} catch (error) {
			void message.error(`Failed to load penalties: ${String(error)}`);
		} finally {
			setIsLoading(false);
		}
	}, [scope, seasonId]);

	useEffect(() => {
		const timeoutId = window.setTimeout(() => {
			void loadPenalties();
		}, 0);

		return () => {
			window.clearTimeout(timeoutId);
		};
	}, [loadPenalties]);

	const penaltyRows = useMemo(() => {
		const driversById = new Map(
			drivers.map((driver) => [driver.id, driver]),
		);
		const teamsById = new Map(teams.map((team) => [team.id, team]));

		return bookingEntries
			.filter(
				(entry) =>
					entry.sourceType === BookingSourceType.PENALTY_POINTS,
			)
			.map((entry) => ({
				...entry,
				targetName: getPenaltyTargetName(entry, driversById, teamsById),
				penaltyPoints: Math.abs(entry.points),
			}));
	}, [bookingEntries, drivers, teams]);

	const driverOptions = useMemo(() => buildDriverOptions(drivers), [drivers]);
	const teamOptions = useMemo(() => buildTeamOptions(teams), [teams]);

	const sourceOptions = isSeasonTeamBased ? teamOptions : driverOptions;
	const targetLabel = isSeasonTeamBased ? "Team" : "Driver";

	const handleOpenModal = useCallback(() => {
		form.resetFields();
		form.setFieldsValue({ penaltyPoints: 1 });
		setIsModalOpen(true);
	}, [form]);

	const handleCancel = useCallback(() => {
		setIsModalOpen(false);
		form.resetFields();
	}, [form]);

	const handleSubmit = useCallback(async () => {
		try {
			const values = await form.validateFields();
			setIsSaving(true);

			await addPenalty({
				scope: { case: "raceGridId", value: scope.value },
				target: isSeasonTeamBased
					? { case: "teamId", value: values.targetId }
					: { case: "driverId", value: values.targetId },
				penaltyPoints: -Math.abs(values.penaltyPoints),
				reason: values.reason.trim(),
			});
			void message.success("Penalty added.");
			setIsModalOpen(false);
			form.resetFields();
			await loadPenalties();
		} catch (error) {
			if (
				typeof error === "object" &&
				error !== null &&
				"errorFields" in error
			) {
				return;
			}
			void message.error(`Failed to add penalty: ${String(error)}`);
		} finally {
			setIsSaving(false);
		}
	}, [form, isSeasonTeamBased, loadPenalties, scope.value]);

	const handleDeletePenalty = useCallback(
		async (row: PenaltyRow) => {
			setDeletingPenaltyId(row.id);
			try {
				await deletePenalty(row.id);
				void message.success("Penalty deleted.");
				await loadPenalties();
			} catch (error) {
				void message.error(
					`Failed to delete penalty: ${String(error)}`,
				);
			} finally {
				setDeletingPenaltyId(null);
			}
		},
		[loadPenalties],
	);

	const columns: TableColumnsType<PenaltyRow> = [
		{
			title: "Target type",
			dataIndex: "targetType",
			key: "targetType",
			render: (value: BookingTargetType) =>
				getBookingTargetTypeLabel(value),
		},
		{
			title: targetLabel,
			dataIndex: "targetName",
			key: "targetName",
		},
		{
			title: "Penalty points",
			dataIndex: "penaltyPoints",
			key: "penaltyPoints",
			align: "right",
		},
		{
			title: "Reason",
			dataIndex: "description",
			key: "description",
		},
		{
			title: "Actions",
			key: "actions",
			render: (_: unknown, row: PenaltyRow) => (
				<Popconfirm
					title="Delete penalty"
					description={`Delete penalty for ${row.targetName}?`}
					onConfirm={() => void handleDeletePenalty(row)}
					okText="Delete"
					okButtonProps={{ danger: true }}
				>
					<Button
						type="text"
						danger
						size="small"
						icon={<DeleteOutlined />}
						loading={deletingPenaltyId === row.id}
					>
						Delete
					</Button>
				</Popconfirm>
			),
		},
	];

	return (
		<Card
			size="small"
			title="Penalties"
			extra={
				<Space size={8}>
					<Button
						size="small"
						icon={<PlusOutlined />}
						onClick={handleOpenModal}
					>
						New Penalty
					</Button>
					<Button
						size="small"
						icon={<ReloadOutlined />}
						onClick={() => void loadPenalties()}
						loading={isLoading}
					>
						Refresh
					</Button>
				</Space>
			}
		>
			<Table<PenaltyRow>
				size="small"
				rowKey={(row) => row.id}
				loading={isLoading}
				dataSource={penaltyRows}
				pagination={false}
				columns={columns}
				locale={{ emptyText: "No penalties" }}
			/>

			<Modal
				title="New penalty"
				open={isModalOpen}
				onCancel={handleCancel}
				onOk={() => void handleSubmit()}
				okText="Add"
				okButtonProps={{ loading: isSaving }}
				destroyOnHidden
			>
				<Form
					form={form}
					layout="vertical"
					initialValues={{ penaltyPoints: 1 }}
				>
					<Form.Item
						label={targetLabel}
						name="targetId"
						rules={[
							{
								required: true,
								message: `${targetLabel} is required`,
							},
						]}
					>
						<Select
							showSearch
							placeholder={`Select ${targetLabel.toLowerCase()}`}
							options={sourceOptions}
							optionFilterProp="label"
							filterOption={(input, option) =>
								String(option?.label ?? "")
									.toLowerCase()
									.includes(input.toLowerCase())
							}
						/>
					</Form.Item>

					<Form.Item
						label="Penalty points"
						name="penaltyPoints"
						rules={[
							{
								required: true,
								message: "Penalty points are required",
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
						label="Reason"
						name="reason"
						rules={[
							{ required: true, message: "Reason is required" },
							{ whitespace: true, message: "Reason is required" },
						]}
					>
						<Input.TextArea rows={4} maxLength={250} />
					</Form.Item>
				</Form>
			</Modal>
		</Card>
	);
}
