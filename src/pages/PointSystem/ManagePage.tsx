import { getCommandClient, getQueryClient } from "@/api/grpcClients";
import {
	CopyOutlined,
	DeleteOutlined,
	EditOutlined,
	PlusOutlined,
	SearchOutlined,
} from "@ant-design/icons";
import type { PointSystem } from "@buf/srlmgr_api.bufbuild_es/backend/common/v1/common_pb";
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

export function PointSystemManagePage() {
	const navigate = useNavigate();
	const [items, setItems] = useState<PointSystem[]>([]);
	const [loading, setLoading] = useState(false);
	const [nameFilter, setNameFilter] = useState("");
	const [copyingId, setCopyingId] = useState<number | null>(null);

	const filteredItems = useMemo(
		() =>
			nameFilter.trim() === ""
				? items
				: items.filter((item) =>
						item.name
							.toLowerCase()
							.includes(nameFilter.trim().toLowerCase()),
					),
		[items, nameFilter],
	);

	const loadItems = useCallback(async () => {
		try {
			setLoading(true);
			const response = await getQueryClient().listPointSystems({});
			setItems(response.items);
		} catch (error) {
			void message.error("Failed to load point systems");
			console.error(error);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		const timeoutId = window.setTimeout(() => {
			void loadItems();
		}, 0);

		return () => {
			window.clearTimeout(timeoutId);
		};
	}, [loadItems]);

	const handleDelete = async (pointSystemId: number) => {
		try {
			await getCommandClient().deletePointSystem({ pointSystemId });
			void message.success("Point system deleted successfully");
			void loadItems();
		} catch (error) {
			console.error(error);
			void message.error("Failed to delete point system");
		}
	};

	const handleCopy = async (pointSystemId: number) => {
		setCopyingId(pointSystemId);
		try {
			const response = await getQueryClient().getPointSystem({
				id: pointSystemId,
			});
			const source = response.pointSystem;
			if (!source) {
				void message.error("Point system not found");
				return;
			}

			await getCommandClient().createPointSystem({
				name: `${source.name} (Copy)`,
				description: source.description,
				eligibility: source.eligibility,
				raceSettings: source.raceSettings,
			});

			void message.success("Point system copied successfully");
			void loadItems();
		} catch (error) {
			console.error(error);
			void message.error("Failed to copy point system");
		} finally {
			setCopyingId(null);
		}
	};

	const columns: ColumnsType<PointSystem> = [
		{
			title: (
				<Space size={4} onClick={(event) => event.stopPropagation()}>
					<Input
						placeholder="Filter by name"
						prefix={<SearchOutlined />}
						value={nameFilter}
						size="small"
						allowClear
						onChange={(event) => setNameFilter(event.target.value)}
					/>
				</Space>
			),
			dataIndex: "name",
			key: "name",
			sorter: (a, b) => a.name.localeCompare(b.name),
			defaultSortOrder: "ascend",
		},
		{
			title: "Description",
			dataIndex: "description",
			key: "description",
			render: (description: string) => description || "-",
		},
		{
			title: "Eligibility",
			key: "eligibility",
			render: (_, record) => {
				if (!record.eligibility) {
					return "-";
				}
				const minRaceDistancePercent = Math.round(
					record.eligibility.minRaceDistancePercent * 100,
				);
				return `${minRaceDistancePercent}% / Guests: ${record.eligibility.guests ? "Yes" : "No"}`;
			},
		},
		{
			title: "Race Settings",
			key: "raceSettings",
			render: (_, record) => record.raceSettings.length,
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
								navigate(`/point-systems/${record.id}/edit`)
							}
						/>
					</Tooltip>
					<Tooltip title="Copy">
						<Button
							type="text"
							icon={<CopyOutlined />}
							loading={copyingId === record.id}
							onClick={() => void handleCopy(record.id)}
						/>
					</Tooltip>
					<Popconfirm
						title="Delete Point System"
						description="Are you sure you want to delete this point system?"
						onConfirm={() => void handleDelete(record.id)}
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
				<h2>Manage Point Systems</h2>
				<Button
					type="primary"
					icon={<PlusOutlined />}
					onClick={() => navigate("/point-systems/new")}
				>
					Add Point System
				</Button>
			</div>

			<Table<PointSystem>
				columns={columns}
				dataSource={filteredItems}
				loading={loading}
				rowKey="id"
				pagination={{
					defaultPageSize: 20,
					showSizeChanger: true,
					size: "small",
				}}
			/>
		</div>
	);
}
