import { formatTimestamp, listSeasonEvents } from "@/api/seasons";
import { ArrowLeftOutlined, ReloadOutlined } from "@ant-design/icons";
import type { Event } from "@buf/srlmgr_api.bufbuild_es/backend/common/v1/common_pb";
import type { EventContainer } from "@buf/srlmgr_api.bufbuild_es/backend/query/v1/frontend_pb";
import { Button, Card, Space, Table, Typography, message } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const { Title, Text } = Typography;

type SeasonEventRow = {
	event: Event;
	trackLabel: string;
};

function toTrackLabel(item: EventContainer): string {
	const trackName = item.track?.name?.trim() || "-";
	const layoutName = item.trackLayout?.name?.trim() || "";

	if (layoutName === "" || layoutName.startsWith("-")) {
		return trackName;
	}

	return `${trackName} (${layoutName})`;
}

function toSeasonEventRows(items: EventContainer[]): SeasonEventRow[] {
	return items
		.filter((item): item is EventContainer & { event: Event } =>
			Boolean(item.event),
		)
		.map((item) => ({
			event: item.event,
			trackLabel: toTrackLabel(item),
		}));
}

export function SeasonManagePage() {
	const navigate = useNavigate();
	const params = useParams();
	const seasonId = Number(params.seasonId);
	const [seasonName, setSeasonName] = useState<string>("");
	const [events, setEvents] = useState<SeasonEventRow[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	const isValidSeasonId = Number.isFinite(seasonId) && seasonId > 0;

	const loadData = useCallback(async () => {
		if (!isValidSeasonId) {
			return;
		}

		setIsLoading(true);
		try {
			const seasonEventsData = await listSeasonEvents(seasonId);
			setSeasonName(
				seasonEventsData.season?.name ?? `Season #${seasonId}`,
			);
			setEvents(toSeasonEventRows(seasonEventsData.events));
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
		() =>
			[...events].sort((a, b) => a.event.sequenceNo - b.event.sequenceNo),
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
				<Table<SeasonEventRow>
					rowKey={(row) => row.event.id}
					loading={isLoading}
					dataSource={sortedEvents}
					pagination={{ pageSize: 20, showSizeChanger: true }}
					columns={[
						{
							title: "Event Name",
							key: "name",
							render: (_, row) => row.event.name,
							sorter: (a, b) =>
								a.event.name.localeCompare(b.event.name),
						},
						{
							title: "Event Date",
							key: "eventDate",
							render: (_, row) =>
								formatTimestamp(row.event.eventDate),
							sorter: (a, b) =>
								Number(a.event.eventDate?.seconds ?? 0n) -
								Number(b.event.eventDate?.seconds ?? 0n),
						},
						{
							title: "Track",
							key: "track",
							render: (_, row) => row.trackLabel,
							sorter: (a, b) =>
								a.trackLabel.localeCompare(b.trackLabel),
						},
					]}
				/>
			</Card>
		</Space>
	);
}
