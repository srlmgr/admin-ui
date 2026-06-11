import {
	formatTimestamp,
	listSeasonsOverview,
	type SeasonOverviewItem,
} from "@/api/seasons";
import {
	EditOutlined,
	PlusOutlined,
	ReloadOutlined,
	SettingOutlined,
} from "@ant-design/icons";
import { Button, Card, Select, Space, Table, Typography, message } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const { Title } = Typography;

export function SeasonsPage() {
	const navigate = useNavigate();
	const [items, setItems] = useState<SeasonOverviewItem[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [selectedSeriesId, setSelectedSeriesId] = useState<number | null>(
		null,
	);

	const loadSeasons = useCallback(async () => {
		setIsLoading(true);
		try {
			const nextItems = await listSeasonsOverview();
			setItems(nextItems);
			setSelectedSeriesId((current) => {
				const availableSeriesIds = new Set(
					nextItems.map((entry) => entry.season.seriesId),
				);
				if (current !== null && availableSeriesIds.has(current)) {
					return current;
				}
				const firstSeriesId = nextItems[0]?.season.seriesId;
				return firstSeriesId ?? null;
			});
		} catch (error) {
			void message.error(`Failed to load seasons: ${String(error)}`);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		const timeoutId = window.setTimeout(() => {
			void loadSeasons();
		}, 0);
		return () => {
			window.clearTimeout(timeoutId);
		};
	}, [loadSeasons]);

	const seriesOptions = useMemo(() => {
		const bySeriesId = new Map<number, string>();
		for (const entry of items) {
			if (!bySeriesId.has(entry.season.seriesId)) {
				bySeriesId.set(entry.season.seriesId, entry.seriesName);
			}
		}
		return Array.from(bySeriesId.entries()).map(([value, label]) => ({
			value,
			label,
		}));
	}, [items]);

	return (
		<Space orientation="vertical" size={16} style={{ width: "100%" }}>
			<Title level={2} style={{ margin: 0 }}>
				Seasons
			</Title>

			<Card
				title="Active Seasons"
				extra={
					<Space>
						<Select
							placeholder="Select series for new season"
							style={{ minWidth: 260 }}
							value={selectedSeriesId ?? undefined}
							onChange={setSelectedSeriesId}
							options={seriesOptions}
						/>
						<Button
							icon={<PlusOutlined />}
							onClick={() => {
								if (selectedSeriesId === null) {
									void message.warning(
										"Select a series before creating a season.",
									);
									return;
								}
								navigate(
									`/seasons/new?seriesId=${selectedSeriesId}`,
								);
							}}
						>
							New Season
						</Button>
						<Button
							icon={<ReloadOutlined />}
							onClick={() => void loadSeasons()}
							loading={isLoading}
						>
							Refresh
						</Button>
					</Space>
				}
			>
				<Table<SeasonOverviewItem>
					rowKey={(row) => row.season.id}
					loading={isLoading}
					dataSource={items}
					pagination={{ defaultPageSize: 20, showSizeChanger: true }}
					columns={[
						{
							title: "Season Name",
							dataIndex: ["season", "name"],
							key: "seasonName",
							sorter: (a, b) =>
								a.season.name.localeCompare(b.season.name),
							defaultSortOrder: "ascend",
						},
						{
							title: "Starts / Ends",
							key: "seasonDates",
							sorter: (a, b) =>
								Number(a.season.startsAt?.seconds ?? 0n) -
								Number(b.season.startsAt?.seconds ?? 0n),
							render: (_, row) =>
								`${formatTimestamp(row.season.startsAt)} - ${formatTimestamp(row.season.endsAt)}`,
						},
						{
							title: "Series",
							dataIndex: "seriesName",
							key: "seriesName",
							sorter: (a, b) =>
								a.seriesName.localeCompare(b.seriesName),
						},
						{
							title: "Simulation",
							dataIndex: "simulationName",
							key: "simulationName",
							sorter: (a, b) =>
								a.simulationName.localeCompare(
									b.simulationName,
								),
						},
						{
							title: "Actions",
							key: "actions",
							render: (_, row) => (
								<Space>
									<Button
										size="small"
										icon={<SettingOutlined />}
										onClick={() =>
											navigate(
												`/seasons/${row.season.id}/manage`,
											)
										}
									>
										Manage
									</Button>
									<Button
										size="small"
										icon={<EditOutlined />}
										onClick={() =>
											navigate(
												`/seasons/${row.season.id}/edit`,
											)
										}
									>
										Edit
									</Button>
								</Space>
							),
						},
					]}
				/>
			</Card>
		</Space>
	);
}
