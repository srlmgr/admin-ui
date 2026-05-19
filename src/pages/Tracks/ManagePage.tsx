import { deleteTrack, listTracks } from "@/api/tracks";
import {
	DeleteOutlined,
	EditOutlined,
	PlusOutlined,
	SearchOutlined,
} from "@ant-design/icons";
import type { Track } from "@buf/srlmgr_api.bufbuild_es/backend/common/v1/common_pb";
import {
	Button,
	Input,
	Popconfirm,
	Space,
	Table,
	Tooltip,
	message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

export function TrackManagePage() {
	const navigate = useNavigate();
	const [tracks, setTracks] = useState<Track[]>([]);
	const [loading, setLoading] = useState(false);
	const [nameFilter, setNameFilter] = useState("");

	const filteredTracks = useMemo(
		() =>
			nameFilter.trim() === ""
				? tracks
				: tracks.filter((track) =>
						track.name
							.toLowerCase()
							.includes(nameFilter.trim().toLowerCase()),
					),
		[tracks, nameFilter],
	);

	const loadTracks = useCallback(async () => {
		try {
			setLoading(true);
			const data = await listTracks();
			setTracks(data);
		} catch (error) {
			message.error("Failed to load tracks");
			console.error(error);
		} finally {
			setLoading(false);
		}
	}, []);

	// Load tracks on mount
	useEffect(() => {
		const timeoutId = window.setTimeout(() => {
			void loadTracks();
		}, 0);
		return () => {
			window.clearTimeout(timeoutId);
		};
	}, [loadTracks]);

	const handleDeleteTrack = async (trackId: number) => {
		try {
			await deleteTrack(trackId);
			message.success("Track deleted successfully");
			void loadTracks();
		} catch (error) {
			console.error(error);
			message.error("Failed to delete track");
		}
	};

	const columns: ColumnsType<Track> = [
		{
			title: (
				<Space size={4} onClick={(e) => e.stopPropagation()}>
					<Input
						placeholder="Filter by name"
						prefix={<SearchOutlined />}
						value={nameFilter}
						size="small"
						allowClear
						onChange={(e) => setNameFilter(e.target.value)}
					/>
				</Space>
			),
			dataIndex: "name",
			key: "name",
			sorter: (a, b) => a.name.localeCompare(b.name),
			defaultSortOrder: "ascend",
		},
		{
			title: "Country",
			dataIndex: "country",
			key: "country",
		},
		{
			title: "Latitude",
			dataIndex: "latitude",
			key: "latitude",
			render: (lat) => lat?.toFixed(6),
		},
		{
			title: "Longitude",
			dataIndex: "longitude",
			key: "longitude",
			render: (lng) => lng?.toFixed(6),
		},
		{
			title: "Website",
			dataIndex: "websiteUrl",
			key: "websiteUrl",
			render: (url) =>
				url ? (
					<a href={url} target="_blank" rel="noopener noreferrer">
						{url}
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
								navigate(`/tracks/${record.id}/edit`)
							}
						/>
					</Tooltip>
					<Tooltip title="Manage Layouts">
						<Button
							type="primary"
							size="small"
							onClick={() =>
								navigate(`/tracks/${record.id}/layouts`)
							}
						>
							Layouts
						</Button>
					</Tooltip>
					<Popconfirm
						title="Delete Track"
						description="Are you sure you want to delete this track?"
						onConfirm={() => handleDeleteTrack(record.id)}
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
			<div
				style={{
					marginBottom: "16px",
					display: "flex",
					justifyContent: "space-between",
				}}
			>
				<h2>Manage Tracks</h2>
				<Button
					type="primary"
					icon={<PlusOutlined />}
					onClick={() => navigate("/tracks/new")}
				>
					Add Track
				</Button>
			</div>

			<Table<Track>
				columns={columns}
				dataSource={filteredTracks}
				loading={loading}
				rowKey="id"
				pagination={{ pageSize: 10 }}
			/>
		</div>
	);
}
