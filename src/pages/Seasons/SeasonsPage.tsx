import {
	formatTimestamp,
	listSeasonsOverview,
	type SeasonOverviewItem,
} from "@/api/seasons";
import { listSeries } from "@/api/series";
import { listSimulations } from "@/api/simulations";
import {
	EditOutlined,
	PlusOutlined,
	ReloadOutlined,
	SettingOutlined,
} from "@ant-design/icons";
import { Button, Card, Select, Space, Table, Typography, message } from "antd";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const { Title } = Typography;

export function SeasonsPage() {
	const navigate = useNavigate();
	const [items, setItems] = useState<SeasonOverviewItem[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [isSeriesOptionsLoading, setIsSeriesOptionsLoading] = useState(false);
	const [seriesOptions, setSeriesOptions] = useState<
		Array<{ value: number; label: string }>
	>([]);
	const [selectedSeriesId, setSelectedSeriesId] = useState<number | null>(
		null,
	);

	const loadSeasons = useCallback(async () => {
		setIsLoading(true);
		try {
			const nextItems = await listSeasonsOverview();
			setItems(nextItems);
		} catch (error) {
			void message.error(`Failed to load seasons: ${String(error)}`);
		} finally {
			setIsLoading(false);
		}
	}, []);

	const loadSeriesOptions = useCallback(async () => {
		setIsSeriesOptionsLoading(true);
		try {
			const simulations = await listSimulations();
			const seriesBySimulation = await Promise.all(
				simulations.map((simulation) => listSeries(simulation.id)),
			);

			const bySeriesId = new Map<number, string>();
			for (const simulationSeries of seriesBySimulation) {
				for (const series of simulationSeries) {
					if (!bySeriesId.has(series.id)) {
						bySeriesId.set(series.id, series.name);
					}
				}
			}

			const nextOptions = Array.from(bySeriesId.entries()).map(
				([value, label]) => ({ value, label }),
			);
			setSeriesOptions(nextOptions);
			setSelectedSeriesId((current) => {
				if (
					current !== null &&
					nextOptions.some((option) => option.value === current)
				) {
					return current;
				}
				return nextOptions[0]?.value ?? null;
			});
		} catch (error) {
			void message.error(`Failed to load series: ${String(error)}`);
		} finally {
			setIsSeriesOptionsLoading(false);
		}
	}, []);

	useEffect(() => {
		const timeoutId = window.setTimeout(() => {
			void Promise.all([loadSeasons(), loadSeriesOptions()]);
		}, 0);
		return () => {
			window.clearTimeout(timeoutId);
		};
	}, [loadSeasons, loadSeriesOptions]);

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
							loading={isSeriesOptionsLoading}
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
							onClick={() => {
								void Promise.all([
									loadSeasons(),
									loadSeriesOptions(),
								]);
							}}
							loading={isLoading || isSeriesOptionsLoading}
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
									<Button
										size="small"
										onClick={() =>
											navigate(
												`/seasons/${row.season.id}/cars`,
											)
										}
									>
										Cars
									</Button>
									{row.season.isMulticlass && (
										<Button
											size="small"
											onClick={() =>
												navigate(
													`/seasons/${row.season.id}/car-classes`,
												)
											}
										>
											Car classes
										</Button>
									)}
								</Space>
							),
						},
					]}
				/>
			</Card>
		</Space>
	);
}
