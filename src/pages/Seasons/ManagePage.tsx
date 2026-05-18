import { formatTimestamp, getSeason, listSeasonEvents } from "@/api/seasons";
import { ArrowLeftOutlined, ReloadOutlined } from "@ant-design/icons";
import type { Event } from "@buf/srlmgr_api.bufbuild_es/backend/common/v1/common_pb";
import { Button, Card, Space, Table, Typography, message } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const { Title, Text } = Typography;

export function SeasonManagePage() {
	const navigate = useNavigate();
	const params = useParams();
	const seasonId = Number(params.seasonId);
	const [seasonName, setSeasonName] = useState<string>("");
	const [events, setEvents] = useState<Event[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	const isValidSeasonId = Number.isFinite(seasonId) && seasonId > 0;

	const loadData = useCallback(async () => {
		if (!isValidSeasonId) {
			return;
		}

		setIsLoading(true);
		try {
			const [season, seasonEvents] = await Promise.all([
				getSeason(seasonId),
				listSeasonEvents(seasonId),
			]);
			setSeasonName(season?.name ?? `Season #${seasonId}`);
			setEvents(seasonEvents);
		} catch (error) {
			void message.error(
				`Failed to load season events: ${String(error)}`,
			);
		} finally {
			setIsLoading(false);
		}
	}, [isValidSeasonId, seasonId]);

	useEffect(() => {
		const timeoutId = window.setTimeout(() => {
			void loadData();
		}, 0);

		return () => {
			window.clearTimeout(timeoutId);
		};
	}, [loadData]);

	const sortedEvents = useMemo(
		() => [...events].sort((a, b) => a.sequenceNo - b.sequenceNo),
		[events],
	);

	if (!isValidSeasonId) {
		return <Text type="danger">Invalid season id.</Text>;
	}

	return (
		<Space orientation="vertical" size={16} style={{ width: "100%" }}>
			<Space>
				<Button
					icon={<ArrowLeftOutlined />}
					onClick={() => navigate("/seasons")}
				>
					Back
				</Button>
				<Title level={2} style={{ margin: 0 }}>
					Manage {seasonName}
				</Title>
			</Space>

			<Card
				title="Season Events"
				extra={
					<Button
						icon={<ReloadOutlined />}
						onClick={() => void loadData()}
						loading={isLoading}
					>
						Refresh
					</Button>
				}
			>
				<Table<Event>
					rowKey={(event) => event.id}
					loading={isLoading}
					dataSource={sortedEvents}
					pagination={{ pageSize: 20, showSizeChanger: true }}
					columns={[
						{
							title: "Event Name",
							dataIndex: "name",
							key: "name",
							sorter: (a, b) => a.name.localeCompare(b.name),
						},
						{
							title: "Event Date",
							key: "eventDate",
							render: (_, event) =>
								formatTimestamp(event.eventDate),
							sorter: (a, b) =>
								Number(a.eventDate?.seconds ?? 0n) -
								Number(b.eventDate?.seconds ?? 0n),
						},
						{
							title: "Track",
							key: "track",
							render: () => "tbd",
						},
					]}
				/>
			</Card>
		</Space>
	);
}
