import { getEventSummary, getRaceSummary } from "@/api/events";
import { ReloadOutlined } from "@ant-design/icons";
import {
	SummaryTargetType,
	type Driver,
	type Summary,
	type Team,
} from "@buf/srlmgr_api.bufbuild_es/backend/common/v1/common_pb";
import type { TableColumnsType, TabsProps } from "antd";
import { Button, Collapse, Table, Tabs, message } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";

type SummaryScope =
	| {
			case: "eventId";
			value: number;
	  }
	| {
			case: "raceId";
			value: number;
	  };

type SummarySectionProps = {
	scope: SummaryScope;
	summaryTargetType?: SummaryTargetType;
	refreshToken?: number;
};

type SummaryTableRow = Summary & {
	name: string;
};

function buildSummaryRows(
	summaries: Summary[],
	namesById: Map<number, string>,
	fallbackPrefix: string,
): SummaryTableRow[] {
	return [...summaries]
		.sort((a, b) => b.totalPoints - a.totalPoints)
		.map((item) => ({
			...item,
			name:
				namesById.get(item.referenceId) ??
				`${fallbackPrefix} #${item.referenceId}`,
		}));
}

const summaryColumns: TableColumnsType<SummaryTableRow> = [
	{
		title: "Name",
		dataIndex: "name",
		key: "name",
		sorter: (a, b) => a.name.localeCompare(b.name),
	},
	{
		title: "Points",
		dataIndex: "points",
		key: "points",
		align: "right",
		sorter: (a, b) => a.points - b.points,
	},
	{
		title: "Bonus",
		dataIndex: "bonusPoints",
		key: "bonusPoints",
		align: "right",
		sorter: (a, b) => a.bonusPoints - b.bonusPoints,
	},
	{
		title: "Penalty",
		dataIndex: "penaltyPoints",
		key: "penaltyPoints",
		align: "right",
		sorter: (a, b) => a.penaltyPoints - b.penaltyPoints,
	},
	{
		title: "Total",
		dataIndex: "totalPoints",
		key: "totalPoints",
		align: "right",
		sorter: (a, b) => a.totalPoints - b.totalPoints,
		defaultSortOrder: "descend",
	},
];

export function SummarySection({
	scope,
	summaryTargetType,
	refreshToken,
}: SummarySectionProps) {
	const [isLoading, setIsLoading] = useState(false);
	const [driverSummaries, setDriverSummaries] = useState<Summary[]>([]);
	const [drivers, setDrivers] = useState<Driver[]>([]);
	const [teamSummaries, setTeamSummaries] = useState<Summary[]>([]);
	const [teams, setTeams] = useState<Team[]>([]);

	const loadSummary = useCallback(async () => {
		setIsLoading(true);
		try {
			const getSummaryForScope =
				scope.case === "eventId"
					? (type: SummaryTargetType) =>
							getEventSummary(scope.value, type)
					: (type: SummaryTargetType) =>
							getRaceSummary(scope.value, type);

			if (summaryTargetType === SummaryTargetType.DRIVER) {
				const driverResponse = await getSummaryForScope(
					SummaryTargetType.DRIVER,
				);
				setDriverSummaries(driverResponse.summaries);
				setDrivers(driverResponse.drivers);
				setTeamSummaries([]);
				setTeams([]);
				return;
			}

			if (summaryTargetType === SummaryTargetType.TEAM) {
				const teamResponse = await getSummaryForScope(
					SummaryTargetType.TEAM,
				);
				setTeamSummaries(teamResponse.summaries);
				setTeams(teamResponse.teams);
				setDriverSummaries([]);
				setDrivers([]);
				return;
			}

			const [driverResponse, teamResponse] = await Promise.all([
				getSummaryForScope(SummaryTargetType.DRIVER),
				getSummaryForScope(SummaryTargetType.TEAM),
			]);

			setDriverSummaries(driverResponse.summaries);
			setDrivers(driverResponse.drivers);
			setTeamSummaries(teamResponse.summaries);
			setTeams(teamResponse.teams);
		} catch (error) {
			void message.error(`Failed to load summary: ${String(error)}`);
		} finally {
			setIsLoading(false);
		}
	}, [scope.case, scope.value, summaryTargetType]);

	useEffect(() => {
		const timeoutId = window.setTimeout(() => {
			void loadSummary();
		}, 0);

		return () => {
			window.clearTimeout(timeoutId);
		};
	}, [loadSummary, refreshToken]);

	const driverRows = useMemo(() => {
		const namesById = new Map(
			drivers.map((driver) => [driver.id, driver.name]),
		);
		return buildSummaryRows(driverSummaries, namesById, "Driver");
	}, [driverSummaries, drivers]);

	const teamRows = useMemo(() => {
		const namesById = new Map(teams.map((team) => [team.id, team.name]));
		return buildSummaryRows(teamSummaries, namesById, "Team");
	}, [teamSummaries, teams]);

	const tabItems: TabsProps["items"] = [
		{
			key: "drivers",
			label: "Drivers",
			children: (
				<Table<SummaryTableRow>
					size="small"
					rowKey={(row) => `${row.referenceId}-${row.totalPoints}`}
					loading={isLoading}
					dataSource={driverRows}
					pagination={false}
					columns={summaryColumns}
					locale={{ emptyText: "No driver summary" }}
				/>
			),
		},
		{
			key: "teams",
			label: "Teams",
			children: (
				<Table<SummaryTableRow>
					size="small"
					rowKey={(row) => `${row.referenceId}-${row.totalPoints}`}
					loading={isLoading}
					dataSource={teamRows}
					pagination={false}
					columns={summaryColumns}
					locale={{ emptyText: "No team summary" }}
				/>
			),
		},
	];

	const singleTargetRows =
		summaryTargetType === SummaryTargetType.TEAM ? teamRows : driverRows;
	const singleTargetLabel =
		summaryTargetType === SummaryTargetType.TEAM ? "Teams" : "Drivers";
	const singleTargetEmptyText =
		summaryTargetType === SummaryTargetType.TEAM
			? "No team summary"
			: "No driver summary";

	return (
		<Collapse
			defaultActiveKey={["summary"]}
			items={[
				{
					key: "summary",
					label: "Summary",
					extra: (
						<Button
							icon={<ReloadOutlined />}
							onClick={(event) => {
								event.stopPropagation();
								void loadSummary();
							}}
							loading={isLoading}
						>
							Refresh
						</Button>
					),
					children: summaryTargetType ? (
						<Table<SummaryTableRow>
							size="small"
							rowKey={(row) =>
								`${row.referenceId}-${row.totalPoints}`
							}
							title={() => singleTargetLabel}
							loading={isLoading}
							dataSource={singleTargetRows}
							pagination={false}
							columns={summaryColumns}
							locale={{ emptyText: singleTargetEmptyText }}
						/>
					) : (
						<Tabs defaultActiveKey="drivers" items={tabItems} />
					),
				},
			]}
		/>
	);
}
