import { getBookingEntries, type BookingEntriesScope } from "@/api/bookings";
import {
	BookingSourceType,
	BookingTargetType,
	type BookingEntry,
	type Driver,
	type Race,
	type RaceGrid,
	type Team,
} from "@buf/srlmgr_api.bufbuild_es/backend/common/v1/common_pb";
import type { TableColumnsType } from "antd";
import { message, Table } from "antd";
import { useEffect, useMemo, useState } from "react";

type BookingEntriesTableProps = {
	scope: BookingEntriesScope;
	races?: Race[];
	grids?: RaceGrid[];
	refreshToken?: number;
};

type BookingTableRow = BookingEntry & {
	targetName: string;
	raceName: string;
	gridName: string;
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

export function BookingEntriesTable({
	scope,
	races = [],
	grids = [],
	refreshToken,
}: BookingEntriesTableProps) {
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
	}, [scope.case, scope.value, refreshToken]);

	const rows = useMemo(() => {
		const driversById = new Map(
			drivers.map((driver) => [driver.id, driver]),
		);
		const teamsById = new Map(teams.map((team) => [team.id, team]));
		const racesById = new Map(races.map((race) => [race.id, race]));
		const gridsById = new Map(grids.map((grid) => [grid.id, grid]));

		return bookingEntries.map((entry) => {
			const raceId = entry.raceId > 0 ? entry.raceId : undefined;
			const gridId = entry.raceGridId > 0 ? entry.raceGridId : undefined;
			return {
				...entry,
				targetName: getTargetName(entry, driversById, teamsById),
				raceName: raceId
					? (racesById.get(raceId)?.name ?? `Race #${raceId}`)
					: "-",
				gridName: gridId
					? (gridsById.get(gridId)?.name ?? `Grid #${gridId}`)
					: "-",
			};
		});
	}, [bookingEntries, drivers, grids, races, teams]);

	const columns: TableColumnsType<BookingTableRow> = useMemo(
		() => [
			...(scope.case !== "gridId" && scope.case !== "raceId"
				? [
						{
							title: "Race",
							dataIndex: "raceName",
							key: "raceName",
							sorter: (a: BookingTableRow, b: BookingTableRow) =>
								a.raceName.localeCompare(b.raceName),
						},
					]
				: []),
			...(scope.case !== "gridId"
				? [
						{
							title: "Grid",
							dataIndex: "gridName",
							key: "gridName",
							sorter: (a: BookingTableRow, b: BookingTableRow) =>
								a.gridName.localeCompare(b.gridName),
						},
					]
				: []),
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
