import {
	deleteSeasonDriverEntry,
	formatTimestamp,
	listSeasonDrivers,
} from "@/api/seasons";
import {
	SeasonDriverModal,
	type SeasonDriverRowData,
} from "@/pages/Seasons/components/SeasonDriverModal";
import {
	DeleteOutlined,
	EditOutlined,
	PlusOutlined,
	ReloadOutlined,
} from "@ant-design/icons";
import type { SeasonDriver } from "@buf/srlmgr_api.bufbuild_es/backend/common/v1/common_pb";
import type { Timestamp } from "@bufbuild/protobuf/wkt";
import { Button, Card, Popconfirm, Space, Switch, Table, message } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";

type SeasonDriverRow = {
	key: string;
	seasonDriverId: number;
	driverId: number;
	carModelId: number;
	carNumber: string;
	driverName: string;
	carModelName: string;
	joinedAt?: Timestamp;
	leftAt?: Timestamp;
};

type SeasonDriversProps = {
	seasonId: number;
};

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
	items: Awaited<ReturnType<typeof listSeasonDrivers>>,
): SeasonDriverRow[] {
	const rows: SeasonDriverRow[] = [];

	items.forEach((item, itemIndex) => {
		const driversById = new Map(
			item.drivers.map((driver) => [driver.id, driver]),
		);
		const carModelsById = new Map(
			item.carData
				.filter((carDataItem) => Boolean(carDataItem.carModel))
				.map((carDataItem) => [
					String(carDataItem.carModel?.id ?? ""),
					carDataItem.carModel,
				]),
		);

		item.seasonDrivers.forEach((seasonDriver: SeasonDriver) => {
			const driver = driversById.get(seasonDriver.driverId);
			const carModel = carModelsById.get(String(seasonDriver.carModelId));
			rows.push({
				key: `${itemIndex}-${seasonDriver.id}`,
				seasonDriverId: seasonDriver.id,
				driverId: seasonDriver.driverId,
				carModelId: seasonDriver.carModelId,
				carNumber: seasonDriver.carNumber?.trim() || "-",
				driverName:
					driver?.name?.trim() || `Driver #${seasonDriver.driverId}`,
				carModelName:
					carModel?.name?.trim() ||
					`Car model #${seasonDriver.carModelId}`,
				joinedAt: seasonDriver.joinedAt,
				leftAt: seasonDriver.leftAt,
			});
		});
	});

	return rows;
}

function toRowData(row: SeasonDriverRow): SeasonDriverRowData {
	return {
		seasonDriverId: row.seasonDriverId,
		driverId: row.driverId,
		carModelId: row.carModelId,
		carNumber: row.carNumber,
		joinedAt: row.joinedAt,
		leftAt: row.leftAt,
	};
}

export function SeasonDrivers({ seasonId }: SeasonDriversProps) {
	const [rows, setRows] = useState<SeasonDriverRow[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [activeOnly, setActiveOnly] = useState(false);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingRow, setEditingRow] = useState<SeasonDriverRow | null>(null);
	const [deletingSeasonDriverId, setDeletingSeasonDriverId] = useState<
		number | null
	>(null);

	const loadSeasonDrivers = useCallback(async () => {
		setIsLoading(true);
		try {
			const items = await listSeasonDrivers(seasonId);
			setRows(toRows(items));
		} catch (error) {
			void message.error(
				`Failed to load season drivers: ${String(error)}`,
			);
		} finally {
			setIsLoading(false);
		}
	}, [seasonId]);

	useEffect(() => {
		const timeoutId = window.setTimeout(() => {
			void loadSeasonDrivers();
		}, 0);

		return () => {
			window.clearTimeout(timeoutId);
		};
	}, [loadSeasonDrivers]);

	const sortedRows = useMemo(() => {
		const filtered = activeOnly ? rows.filter((row) => !row.leftAt) : rows;
		return [...filtered].sort((a, b) =>
			a.driverName.localeCompare(b.driverName),
		);
	}, [activeOnly, rows]);

	const allRowData = useMemo(() => rows.map(toRowData), [rows]);

	const handleNewDriver = () => {
		setEditingRow(null);
		setIsModalOpen(true);
	};

	const handleEditRow = (row: SeasonDriverRow) => {
		setEditingRow(row);
		setIsModalOpen(true);
	};

	const handleDeleteRow = useCallback(
		async (row: SeasonDriverRow) => {
			setDeletingSeasonDriverId(row.seasonDriverId);
			try {
				await deleteSeasonDriverEntry(row.seasonDriverId);
				void message.success("Season driver deleted.");
				if (editingRow?.seasonDriverId === row.seasonDriverId) {
					setEditingRow(null);
					setIsModalOpen(false);
				}
				void loadSeasonDrivers();
			} catch (error) {
				void message.error(
					`Failed to delete season driver: ${String(error)}`,
				);
			} finally {
				setDeletingSeasonDriverId(null);
			}
		},
		[editingRow, loadSeasonDrivers],
	);

	const handleModalCancel = () => {
		setIsModalOpen(false);
		setEditingRow(null);
	};

	const handleModalSaved = () => {
		setIsModalOpen(false);
		setEditingRow(null);
		void loadSeasonDrivers();
	};

	return (
		<>
			<Card
				size="small"
				title="Season Drivers"
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
							onClick={handleNewDriver}
						>
							New Driver
						</Button>
						<Button
							size="small"
							icon={<ReloadOutlined />}
							onClick={() => void loadSeasonDrivers()}
							loading={isLoading}
						>
							Refresh
						</Button>
					</Space>
				}
			>
				<Table<SeasonDriverRow>
					size="small"
					rowKey={(row) => row.key}
					loading={isLoading}
					dataSource={sortedRows}
					pagination={{
						defaultPageSize: 50,
						showSizeChanger: true,
						size: "small",
					}}
					columns={[
						{
							title: "Car Number",
							key: "carNumber",
							dataIndex: "carNumber",
							sorter: (a, b) =>
								compareCarNumbers(a.carNumber, b.carNumber),
						},
						{
							title: "Driver Name",
							key: "driverName",
							dataIndex: "driverName",
							defaultSortOrder: "ascend",
							sorter: (a, b) =>
								a.driverName.localeCompare(b.driverName),
						},
						{
							title: "Car Model Name",
							key: "carModelName",
							dataIndex: "carModelName",
							sorter: (a, b) =>
								a.carModelName.localeCompare(b.carModelName),
						},
						{
							title: "Joined At",
							key: "joinedAt",
							render: (_, row) => formatTimestamp(row.joinedAt),
							sorter: (a, b) =>
								toTimestampSortValue(a.joinedAt) -
								toTimestampSortValue(b.joinedAt),
						},
						{
							title: "Left At",
							key: "leftAt",
							render: (_, row) => formatTimestamp(row.leftAt),
							sorter: (a, b) =>
								toTimestampSortValue(a.leftAt) -
								toTimestampSortValue(b.leftAt),
						},
						{
							title: "Actions",
							key: "actions",
							render: (_, row) => (
								<Space size={4}>
									<Button
										type="text"
										size="small"
										icon={<EditOutlined />}
										onClick={() => handleEditRow(row)}
									>
										Edit
									</Button>
									<Popconfirm
										title="Delete season driver"
										description={`Delete ${row.driverName} (${row.carNumber})?`}
										onConfirm={() =>
											void handleDeleteRow(row)
										}
										okText="Delete"
										okButtonProps={{ danger: true }}
									>
										<Button
											type="text"
											size="small"
											danger
											icon={<DeleteOutlined />}
											loading={
												deletingSeasonDriverId ===
												row.seasonDriverId
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

			<SeasonDriverModal
				open={isModalOpen}
				seasonId={seasonId}
				editRow={editingRow ? toRowData(editingRow) : undefined}
				allRows={allRowData}
				onCancel={handleModalCancel}
				onSaved={handleModalSaved}
			/>
		</>
	);
}
