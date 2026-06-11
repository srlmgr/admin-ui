import { deleteTrackLayout, getTrack, listTrackLayouts } from "@/api/tracks";
import {
	ArrowLeftOutlined,
	DeleteOutlined,
	EditOutlined,
	PlusOutlined,
} from "@ant-design/icons";
import type { TrackLayout } from "@buf/srlmgr_api.bufbuild_es/backend/common/v1/common_pb";
import {
	Button,
	Card,
	Empty,
	Popconfirm,
	Space,
	Spin,
	Table,
	Tooltip,
	message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export function TrackLayoutsPage() {
	const navigate = useNavigate();
	const { trackId } = useParams<{ trackId: string }>();
	const [layouts, setLayouts] = useState<TrackLayout[]>([]);
	const [loading, setLoading] = useState(false);
	const [trackName, setTrackName] = useState<string>("");

	const loadLayoutsAndTrack = useCallback(async () => {
		if (!trackId) return;
		try {
			setLoading(true);
			const trackIdNum = Number(trackId);
			const [layoutData, trackData] = await Promise.all([
				listTrackLayouts(trackIdNum),
				getTrack(trackIdNum),
			]);
			setLayouts(layoutData);
			if (trackData) {
				setTrackName(trackData.name);
			}
		} catch (error) {
			message.error("Failed to load track layouts");
			console.error(error);
		} finally {
			setLoading(false);
		}
	}, [trackId]);

	useEffect(() => {
		const timeoutId = window.setTimeout(() => {
			void loadLayoutsAndTrack();
		}, 0);
		return () => {
			window.clearTimeout(timeoutId);
		};
	}, [loadLayoutsAndTrack]);

	const handleDeleteLayout = async (layoutId: number) => {
		try {
			await deleteTrackLayout(layoutId);
			message.success("Layout deleted successfully");
			void loadLayoutsAndTrack();
		} catch (error) {
			console.error(error);
			message.error("Failed to delete layout");
		}
	};

	const columns: ColumnsType<TrackLayout> = [
		{
			title: "Name",
			dataIndex: "name",
			key: "name",
		},
		{
			title: "Length (meters)",
			dataIndex: "lengthMeters",
			key: "lengthMeters",
		},
		{
			title: "Layout Image",
			dataIndex: "layoutImageUrl",
			key: "layoutImageUrl",
			render: (url) =>
				url ? (
					<a href={url} target="_blank" rel="noopener noreferrer">
						View
					</a>
				) : (
					"-"
				),
		},
		{
			title: "Actions",
			key: "actions",
			render: (_, record) => (
				<Space>
					<Tooltip title="Edit">
						<Button
							type="text"
							icon={<EditOutlined />}
							onClick={() =>
								navigate(
									`/tracks/${trackId}/layouts/${record.id}/edit`,
								)
							}
						/>
					</Tooltip>
					<Popconfirm
						title="Delete Layout"
						description="Are you sure you want to delete this layout?"
						onConfirm={() => handleDeleteLayout(record.id)}
						okText="Yes"
						cancelText="No"
					>
						<Tooltip title="Delete">
							<Button
								type="text"
								danger
								icon={<DeleteOutlined />}
							/>
						</Tooltip>
					</Popconfirm>
				</Space>
			),
		},
	];

	return (
		<div style={{ padding: "24px" }}>
			<Button
				type="text"
				icon={<ArrowLeftOutlined />}
				onClick={() => navigate("/tracks")}
				style={{ marginBottom: "16px" }}
			>
				Back to Tracks
			</Button>

			<Card
				title={`Manage Layouts - ${trackName}`}
				extra={
					<Button
						type="primary"
						icon={<PlusOutlined />}
						onClick={() =>
							navigate(`/tracks/${trackId}/layouts/new`)
						}
					>
						Add Layout
					</Button>
				}
			>
				<Spin spinning={loading}>
					{layouts.length === 0 ? (
						<Empty description="No layouts found" />
					) : (
						<Table<TrackLayout>
							columns={columns}
							dataSource={layouts}
							loading={loading}
							rowKey="id"
							pagination={{
								defaultPageSize: 20,
								showSizeChanger: true,
								size: "small",
							}}
						/>
					)}
				</Spin>
			</Card>
		</div>
	);
}
