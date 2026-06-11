import {
	addTeamMember,
	deleteSeasonTeam,
	deleteTeamMember,
	formatTimestamp,
	listSeasonDrivers,
	listSeasonTeams,
	listTeamMembers,
	removeTeamMember,
} from "@/api/seasons";
import {
	SeasonTeamModal,
	type SeasonTeamRowData,
} from "@/pages/Seasons/components/SeasonTeamModal";
import {
	DeleteOutlined,
	EditOutlined,
	PlusOutlined,
	ReloadOutlined,
	TeamOutlined,
} from "@ant-design/icons";
import type {
	Team,
	TeamMember,
} from "@buf/srlmgr_api.bufbuild_es/backend/common/v1/common_pb";
import type { Timestamp } from "@bufbuild/protobuf/wkt";
import {
	Button,
	Card,
	DatePicker,
	Flex,
	Form,
	Modal,
	Popconfirm,
	Select,
	Space,
	Switch,
	Table,
	Typography,
	message,
} from "antd";
import type { Dayjs } from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";

type SeasonTeamRow = {
	key: string;
	teamId: number;
	teamName: string;
	isActive: boolean;
	carModelId: number;
	carModelName: string;
	carNumber: string;
	joinedAt?: Timestamp;
	leftAt?: Timestamp;
};

type SeasonTeamsProps = {
	seasonId: number;
	isTeamBased: boolean;
};

type DriverOption = {
	driverId: number;
	name: string;
};

type TeamMemberFormValues = {
	driverId: number;
	joinedAt?: Dayjs;
	leftAt?: Dayjs;
};

function dayjsToDate(value?: Dayjs): Date | undefined {
	return value?.isValid() ? value.toDate() : undefined;
}

function toTimestampSortValue(timestamp?: Timestamp): number {
	if (!timestamp) {
		return 0;
	}
	return Number(timestamp.seconds ?? 0n);
}

function compareCarNumbers(a: string, b: string): number {
	const aNumber = Number(a);
	const bNumber = Number(b);
	const aIsNumber = Number.isFinite(aNumber);
	const bIsNumber = Number.isFinite(bNumber);

	if (aIsNumber && bIsNumber) {
		return aNumber - bNumber;
	}

	if (aIsNumber) {
		return -1;
	}

	if (bIsNumber) {
		return 1;
	}

	return a.localeCompare(b);
}

function toRows(
	items: Awaited<ReturnType<typeof listSeasonTeams>>,
): SeasonTeamRow[] {
	const rows: SeasonTeamRow[] = [];

	items.forEach((item, itemIndex) => {
		const carModelsById = new Map(
			item.carData
				.filter((carDataItem) => Boolean(carDataItem.carModel))
				.map((carDataItem) => [
					String(carDataItem.carModel?.id ?? ""),
					carDataItem.carModel,
				]),
		);

		item.teams.forEach((team: Team) => {
			const carModel = carModelsById.get(String(team.carModelId));
			rows.push({
				key: `${itemIndex}-${team.id}`,
				teamId: team.id,
				teamName: team.name?.trim() || `Team #${team.id}`,
				isActive: team.isActive,
				carModelId: team.carModelId ?? 0,
				carModelName:
					carModel?.name?.trim() ||
					(team.carModelId ? `Car model #${team.carModelId}` : "-"),
				carNumber: team.carNumber?.trim() || "-",
				joinedAt: team.joinedAt,
				leftAt: team.leftAt,
			});
		});
	});

	return rows;
}

function toSeasonDriverOptions(
	items: Awaited<ReturnType<typeof listSeasonDrivers>>,
): DriverOption[] {
	const namesById = new Map<number, string>();
	const seasonDriverDriverIds: number[] = [];

	items.forEach((item) => {
		item.drivers.forEach((driver) => {
			namesById.set(
				driver.id,
				driver.name?.trim() || `Driver #${driver.id}`,
			);
		});

		item.seasonDrivers.forEach((seasonDriver) => {
			seasonDriverDriverIds.push(seasonDriver.driverId);
			if (!namesById.has(seasonDriver.driverId)) {
				namesById.set(
					seasonDriver.driverId,
					`Driver #${seasonDriver.driverId}`,
				);
			}
		});
	});

	return seasonDriverDriverIds
		.map((driverId) => ({
			driverId,
			name: namesById.get(driverId) || `Driver #${driverId}`,
		}))
		.sort((a, b) => a.name.localeCompare(b.name));
}

function compareTeamMembersByNameThenJoinedAt(
	a: TeamMember,
	b: TeamMember,
): number {
	const byName = (
		a.driver?.name?.trim() || `Driver #${a.driver?.id ?? 0}`
	).localeCompare(b.driver?.name?.trim() || `Driver #${b.driver?.id ?? 0}`);
	if (byName !== 0) {
		return byName;
	}

	const byJoinedAt =
		toTimestampSortValue(a.joinedAt) - toTimestampSortValue(b.joinedAt);
	if (byJoinedAt !== 0) {
		return byJoinedAt;
	}

	return a.id - b.id;
}

function toRowData(row: SeasonTeamRow): SeasonTeamRowData {
	return {
		teamId: row.teamId,
		name: row.teamName,
		isActive: row.isActive,
		carModelId: row.carModelId,
		carModelName: row.carModelName,
		carNumber: row.carNumber === "-" ? "" : row.carNumber,
		joinedAt: row.joinedAt,
		leftAt: row.leftAt,
	};
}

export function SeasonTeams({ seasonId, isTeamBased }: SeasonTeamsProps) {
	const [memberForm] = Form.useForm<TeamMemberFormValues>();
	const [rows, setRows] = useState<SeasonTeamRow[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [activeOnly, setActiveOnly] = useState(false);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingRow, setEditingRow] = useState<SeasonTeamRow | null>(null);
	const [deletingTeamId, setDeletingTeamId] = useState<number | null>(null);
	const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
	const [membersTeam, setMembersTeam] = useState<SeasonTeamRow | null>(null);
	const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
	const [seasonDriverOptions, setSeasonDriverOptions] = useState<
		DriverOption[]
	>([]);
	const [isLoadingMembers, setIsLoadingMembers] = useState(false);
	const [isAddingMember, setIsAddingMember] = useState(false);
	const [removingMemberId, setRemovingMemberId] = useState<number | null>(
		null,
	);
	const [deletingMemberId, setDeletingMemberId] = useState<number | null>(
		null,
	);

	const loadSeasonTeams = useCallback(async () => {
		setIsLoading(true);
		try {
			const items = await listSeasonTeams(seasonId);
			setRows(toRows(items));
		} catch (error) {
			void message.error(`Failed to load season teams: ${String(error)}`);
		} finally {
			setIsLoading(false);
		}
	}, [seasonId]);

	useEffect(() => {
		const timeoutId = window.setTimeout(() => {
			void loadSeasonTeams();
		}, 0);

		return () => {
			window.clearTimeout(timeoutId);
		};
	}, [loadSeasonTeams]);

	const sortedRows = useMemo(() => {
		const filtered = activeOnly
			? rows.filter((row) => row.isActive && !row.leftAt)
			: rows;
		return [...filtered].sort((a, b) =>
			a.teamName.localeCompare(b.teamName),
		);
	}, [activeOnly, rows]);

	const handleNewTeam = () => {
		setEditingRow(null);
		setIsModalOpen(true);
	};

	const handleEditRow = (row: SeasonTeamRow) => {
		setEditingRow(row);
		setIsModalOpen(true);
	};

	const handleDeleteRow = useCallback(
		async (row: SeasonTeamRow) => {
			setDeletingTeamId(row.teamId);
			try {
				const deleted = await deleteSeasonTeam(row.teamId);
				if (!deleted) {
					void message.warning("Team was not deleted by backend.");
					return;
				}
				void message.success("Season team deleted.");
				if (editingRow?.teamId === row.teamId) {
					setEditingRow(null);
					setIsModalOpen(false);
				}
				void loadSeasonTeams();
			} catch (error) {
				void message.error(
					`Failed to delete season team: ${String(error)}`,
				);
			} finally {
				setDeletingTeamId(null);
			}
		},
		[editingRow, loadSeasonTeams],
	);

	const handleModalCancel = () => {
		setIsModalOpen(false);
		setEditingRow(null);
	};

	const handleModalSaved = () => {
		setIsModalOpen(false);
		setEditingRow(null);
		void loadSeasonTeams();
	};

	const loadMembersContext = useCallback(
		async (teamId: number) => {
			setIsLoadingMembers(true);
			try {
				const [seasonDrivers, members] = await Promise.all([
					listSeasonDrivers(seasonId),
					listTeamMembers(teamId),
				]);
				setTeamMembers(
					members.sort((a, b) =>
						(
							a.driver?.name?.trim() ||
							`Driver #${a.driver?.id ?? 0}`
						).localeCompare(
							b.driver?.name?.trim() ||
								`Driver #${b.driver?.id ?? 0}`,
						),
					),
				);
				setSeasonDriverOptions(toSeasonDriverOptions(seasonDrivers));
			} catch (error) {
				void message.error(
					`Failed to load team members: ${String(error)}`,
				);
			} finally {
				setIsLoadingMembers(false);
			}
		},
		[seasonId],
	);

	const handleManageMembers = useCallback(
		(row: SeasonTeamRow) => {
			setMembersTeam(row);
			memberForm.resetFields();
			setIsMembersModalOpen(true);
			void loadMembersContext(row.teamId);
		},
		[loadMembersContext, memberForm],
	);

	const handleCloseMembersModal = () => {
		setIsMembersModalOpen(false);
		setMembersTeam(null);
		setTeamMembers([]);
		setSeasonDriverOptions([]);
		memberForm.resetFields();
		setRemovingMemberId(null);
		setDeletingMemberId(null);
	};

	const handleAddMember = useCallback(async () => {
		if (!membersTeam) {
			return;
		}

		setIsAddingMember(true);
		try {
			const values = await memberForm.validateFields();
			await addTeamMember(membersTeam.teamId, values.driverId, {
				joinedAt: dayjsToDate(values.joinedAt),
				leftAt: dayjsToDate(values.leftAt),
			});
			void message.success("Team member added.");
			memberForm.resetFields();
			await loadMembersContext(membersTeam.teamId);
		} catch (error) {
			if (
				typeof error === "object" &&
				error !== null &&
				"errorFields" in error
			) {
				return;
			}
			void message.error(`Failed to add team member: ${String(error)}`);
		} finally {
			setIsAddingMember(false);
		}
	}, [loadMembersContext, memberForm, membersTeam]);

	const handleRemoveMember = useCallback(
		async (memberId: number) => {
			if (!membersTeam) {
				return;
			}

			setRemovingMemberId(memberId);
			try {
				await removeTeamMember(memberId);
				void message.success("Team member removed.");
				await loadMembersContext(membersTeam.teamId);
			} catch (error) {
				void message.error(
					`Failed to remove team member: ${String(error)}`,
				);
			} finally {
				setRemovingMemberId(null);
			}
		},
		[loadMembersContext, membersTeam],
	);

	const handleDeleteMember = useCallback(
		async (memberId: number) => {
			if (!membersTeam) {
				return;
			}

			setDeletingMemberId(memberId);
			try {
				await deleteTeamMember(memberId);
				void message.success("Team member deleted.");
				await loadMembersContext(membersTeam.teamId);
			} catch (error) {
				void message.error(
					`Failed to delete team member: ${String(error)}`,
				);
			} finally {
				setDeletingMemberId(null);
			}
		},
		[loadMembersContext, membersTeam],
	);

	const availableDriverOptions = useMemo(
		() =>
			seasonDriverOptions.map((driver) => ({
				value: driver.driverId,
				label: driver.name,
			})),
		[seasonDriverOptions],
	);

	const columns = useMemo(() => {
		const baseColumns = [
			{
				title: "Team Name",
				key: "teamName",
				dataIndex: "teamName",
				defaultSortOrder: "ascend" as const,
				sorter: (a: SeasonTeamRow, b: SeasonTeamRow) =>
					a.teamName.localeCompare(b.teamName),
			},
			{
				title: "Joined At",
				key: "joinedAt",
				render: (_: unknown, row: SeasonTeamRow) =>
					formatTimestamp(row.joinedAt),
				sorter: (a: SeasonTeamRow, b: SeasonTeamRow) =>
					toTimestampSortValue(a.joinedAt) -
					toTimestampSortValue(b.joinedAt),
			},
			{
				title: "Left At",
				key: "leftAt",
				render: (_: unknown, row: SeasonTeamRow) =>
					formatTimestamp(row.leftAt),
				sorter: (a: SeasonTeamRow, b: SeasonTeamRow) =>
					toTimestampSortValue(a.leftAt) -
					toTimestampSortValue(b.leftAt),
			},
			{
				title: "Actions",
				key: "actions",
				render: (_: unknown, row: SeasonTeamRow) => (
					<Space size={4}>
						<Button
							type="text"
							size="small"
							icon={<TeamOutlined />}
							onClick={() => handleManageMembers(row)}
						>
							Members
						</Button>
						<Button
							type="text"
							size="small"
							icon={<EditOutlined />}
							onClick={() => handleEditRow(row)}
						>
							Edit
						</Button>
						<Popconfirm
							title="Delete season team"
							description={`Delete ${row.teamName}?`}
							onConfirm={() => void handleDeleteRow(row)}
							okText="Delete"
							okButtonProps={{ danger: true }}
						>
							<Button
								type="text"
								size="small"
								danger
								icon={<DeleteOutlined />}
								loading={deletingTeamId === row.teamId}
							>
								Delete
							</Button>
						</Popconfirm>
					</Space>
				),
			},
		];

		if (!isTeamBased) {
			return baseColumns;
		}

		return [
			{
				title: "Car Number",
				key: "carNumber",
				dataIndex: "carNumber",
				sorter: (a: SeasonTeamRow, b: SeasonTeamRow) =>
					compareCarNumbers(a.carNumber, b.carNumber),
			},
			{
				title: "Car Model Name",
				key: "carModelName",
				dataIndex: "carModelName",
				sorter: (a: SeasonTeamRow, b: SeasonTeamRow) =>
					a.carModelName.localeCompare(b.carModelName),
			},
			...baseColumns,
		];
	}, [deletingTeamId, handleDeleteRow, handleManageMembers, isTeamBased]);

	return (
		<>
			<Card
				size="small"
				title="Season Teams"
				extra={
					<Space size={8}>
						<Switch
							checkedChildren="Active only"
							unCheckedChildren="All"
							checked={activeOnly}
							onChange={setActiveOnly}
							size="small"
						/>
						<Button
							size="small"
							icon={<PlusOutlined />}
							onClick={handleNewTeam}
						>
							New Team
						</Button>
						<Button
							size="small"
							icon={<ReloadOutlined />}
							onClick={() => void loadSeasonTeams()}
							loading={isLoading}
						>
							Refresh
						</Button>
					</Space>
				}
			>
				<Table<SeasonTeamRow>
					size="small"
					rowKey={(row) => row.key}
					loading={isLoading}
					dataSource={sortedRows}
					pagination={{
						showSizeChanger: true,
						size: "small",
						defaultPageSize: 50,
					}}
					columns={columns}
				/>
			</Card>

			<SeasonTeamModal
				open={isModalOpen}
				seasonId={seasonId}
				isTeamBased={isTeamBased}
				editRow={editingRow ? toRowData(editingRow) : undefined}
				onCancel={handleModalCancel}
				onSaved={handleModalSaved}
			/>

			<Modal
				title={
					membersTeam
						? `Manage team members: ${membersTeam.teamName}`
						: "Manage team members"
				}
				open={isMembersModalOpen}
				onCancel={handleCloseMembersModal}
				footer={null}
				destroyOnHidden
			>
				<Space
					orientation="vertical"
					size={12}
					style={{ width: "100%" }}
				>
					<Form<TeamMemberFormValues>
						form={memberForm}
						layout="vertical"
					>
						<Flex gap={8} align="end" wrap>
							<Form.Item
								style={{
									flex: 1,
									minWidth: 220,
									marginBottom: 0,
								}}
								label="Driver"
								name="driverId"
								rules={[
									{
										required: true,
										message: "Driver is required",
									},
								]}
							>
								<Select
									showSearch
									allowClear
									placeholder="Add season driver as team member"
									loading={isLoadingMembers}
									options={availableDriverOptions}
									optionFilterProp="label"
									filterOption={(input, option) =>
										String(option?.label ?? "")
											.toLowerCase()
											.includes(input.toLowerCase())
									}
								/>
							</Form.Item>
							<Form.Item
								style={{ minWidth: 200, marginBottom: 0 }}
								label="Joined At"
								name="joinedAt"
							>
								<DatePicker
									showTime={{
										format: "HH:mm",
										showSecond: false,
									}}
									format="YYYY-MM-DD HH:mm"
									style={{ width: "100%" }}
								/>
							</Form.Item>
							<Form.Item
								style={{ minWidth: 200, marginBottom: 0 }}
								label="Left At"
								name="leftAt"
							>
								<DatePicker
									showTime={{
										format: "HH:mm",
										showSecond: false,
									}}
									format="YYYY-MM-DD HH:mm"
									style={{ width: "100%" }}
								/>
							</Form.Item>
							<Form.Item style={{ marginBottom: 0 }}>
								<Button
									type="primary"
									onClick={() => void handleAddMember()}
									loading={isAddingMember}
								>
									Add Member
								</Button>
							</Form.Item>
						</Flex>
					</Form>

					<Table<TeamMember>
						size="small"
						loading={isLoadingMembers}
						rowKey={(member) => member.id}
						dataSource={[...teamMembers].sort(
							compareTeamMembersByNameThenJoinedAt,
						)}
						pagination={false}
						locale={{ emptyText: "No team members yet." }}
						columns={[
							{
								title: "Driver",
								key: "name",
								render: (_, member) =>
									member.driver?.name?.trim() ||
									`Driver #${member.driver?.id ?? 0}`,
								sorter: (a, b) =>
									(
										a.driver?.name?.trim() || ""
									).localeCompare(
										b.driver?.name?.trim() || "",
									),
							},
							{
								title: "Joined At",
								key: "joinedAt",
								render: (_, member) =>
									formatTimestamp(member.joinedAt),
								sorter: (a, b) =>
									toTimestampSortValue(a.joinedAt) -
									toTimestampSortValue(b.joinedAt),
							},
							{
								title: "Left At",
								key: "leftAt",
								render: (_, member) =>
									formatTimestamp(member.leftAt),
								sorter: (a, b) =>
									toTimestampSortValue(a.leftAt) -
									toTimestampSortValue(b.leftAt),
							},
							{
								title: "Actions",
								key: "actions",
								render: (_, member) => (
									<Space size={4}>
										<Popconfirm
											title="Remove team member"
											description={`Remove ${member.driver?.name?.trim() || `Driver #${member.driver?.id ?? 0}`} from this team?`}
											onConfirm={() =>
												void handleRemoveMember(
													member.id,
												)
											}
											okText="Remove"
										>
											<Button
												type="text"
												loading={
													removingMemberId ===
													member.id
												}
											>
												Remove
											</Button>
										</Popconfirm>
										<Popconfirm
											title="Delete team member"
											description={`Delete ${member.driver?.name?.trim() || `Driver #${member.driver?.id ?? 0}`} from this team?`}
											onConfirm={() =>
												void handleDeleteMember(
													member.id,
												)
											}
											okText="Delete"
											okButtonProps={{ danger: true }}
										>
											<Button
												type="text"
												danger
												icon={<DeleteOutlined />}
												loading={
													deletingMemberId ===
													member.id
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

					<Typography.Text type="secondary">
						Only season drivers are available for adding as team
						members.
					</Typography.Text>
				</Space>
			</Modal>
		</>
	);
}
