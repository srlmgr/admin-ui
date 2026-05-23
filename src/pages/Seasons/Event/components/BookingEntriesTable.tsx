import { getBookingEntries, type BookingEntriesScope } from "@/api/bookings";
import {
	BookingSourceType,
	BookingTargetType,
	type BookingEntry,
	type Driver,
	type Team,
} from "@buf/srlmgr_api.bufbuild_es/backend/common/v1/common_pb";
import type { TableColumnsType } from "antd";
import { message, Table } from "antd";
import { useEffect, useMemo, useState } from "react";

type BookingEntriesTableProps = {
	scope: BookingEntriesScope;
};

type BookingTableRow = BookingEntry & {
	targetName: string;
};

function formatEnumLabel(value: string): string {
	return value
		.toLowerCase()
		.split("_")
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}

function getEnumFilters<TEnum extends Record<string, string | number>>(
	enumObject: TEnum,
	unspecifiedValue: number,
) {
	return Object.entries(enumObject)
		.filter(
			([label, value]) =>
				typeof value === "number" &&
				value !== unspecifiedValue &&
				Number.isNaN(Number(label)),
		)
		.map(([label, value]) => ({
			text: formatEnumLabel(label),
			value: value as number,
		}));
}

function getBookingTargetTypeLabel(value: BookingTargetType): string {
	return BookingTargetType[value]
		? formatEnumLabel(BookingTargetType[value])
		: String(value);
}

function getBookingSourceTypeLabel(value: BookingSourceType): string {
	return BookingSourceType[value]
		? formatEnumLabel(BookingSourceType[value])
		: String(value);
}

function getTargetName(
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

const targetTypeFilters = getEnumFilters(
	BookingTargetType,
	BookingTargetType.UNSPECIFIED,
);
const sourceTypeFilters = getEnumFilters(
	BookingSourceType,
	BookingSourceType.UNSPECIFIED,
);

export function BookingEntriesTable({ scope }: BookingEntriesTableProps) {
	const [bookingEntries, setBookingEntries] = useState<BookingEntry[]>([]);
	const [drivers, setDrivers] = useState<Driver[]>([]);
	const [teams, setTeams] = useState<Team[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		let isCancelled = false;

		const loadBookingEntries = async () => {
			setIsLoading(true);
			try {
				const response = await getBookingEntries(scope);
				if (isCancelled) {
					return;
				}

				setBookingEntries(response.items);
				setDrivers(response.drivers);
				setTeams(response.teams);
			} catch (error) {
				if (!isCancelled) {
					void message.error(
						`Failed to load booking entries: ${String(error)}`,
					);
				}
			} finally {
				if (!isCancelled) {
					setIsLoading(false);
				}
			}
		};

		void loadBookingEntries();

		return () => {
			isCancelled = true;
		};
	}, [scope.case, scope.value]);

	const rows = useMemo(() => {
		const driversById = new Map(
			drivers.map((driver) => [driver.id, driver]),
		);
		const teamsById = new Map(teams.map((team) => [team.id, team]));

		return bookingEntries.map((entry) => ({
			...entry,
			targetName: getTargetName(entry, driversById, teamsById),
		}));
	}, [bookingEntries, drivers, teams]);

	const columns: TableColumnsType<BookingTableRow> = useMemo(
		() => [
			{
				title: "Target type",
				dataIndex: "targetType",
				key: "targetType",
				filters: targetTypeFilters,
				onFilter: (value, row) => row.targetType === value,
				sorter: (a, b) => a.targetType - b.targetType,
				render: (value: BookingTargetType) =>
					getBookingTargetTypeLabel(value),
			},
			{
				title: "Target",
				dataIndex: "targetName",
				key: "targetName",
				sorter: (a, b) => a.targetName.localeCompare(b.targetName),
			},
			{
				title: "Source type",
				dataIndex: "sourceType",
				key: "sourceType",
				filters: sourceTypeFilters,
				onFilter: (value, row) => row.sourceType === value,
				sorter: (a, b) => a.sourceType - b.sourceType,
				render: (value: BookingSourceType) =>
					getBookingSourceTypeLabel(value),
			},
			{
				title: "Points",
				dataIndex: "points",
				key: "points",
				align: "right",
				sorter: (a, b) => a.points - b.points,
			},
			{
				title: "Description",
				dataIndex: "description",
				key: "description",
			},
		],
		[],
	);

	return (
		<Table<BookingTableRow>
			size="small"
			rowKey={(row) => row.id}
			loading={isLoading}
			dataSource={rows}
			pagination={false}
			columns={columns}
			locale={{ emptyText: "No booking entries" }}
		/>
	);
}
