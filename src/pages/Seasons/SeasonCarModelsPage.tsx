import { listAllCarModelOptions, type CarModelOption } from "@/api/cars";
import {
	getSeason,
	listSeasonCarModels,
	setSeasonCarModels,
} from "@/api/seasons";
import { SeasonEntityBreadcrumbs } from "@/pages/Seasons/components/SeasonEntityBreadcrumbs";
import {
	ArrowLeftOutlined,
	DeleteOutlined,
	HolderOutlined,
	PlusOutlined,
	ReloadOutlined,
	SaveOutlined,
} from "@ant-design/icons";
import {
	Button,
	Card,
	Popconfirm,
	Select,
	Space,
	Table,
	Typography,
	message,
} from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const { Title, Text } = Typography;

type SeasonCarModelRow = {
	id: number;
	name: string;
};

export function SeasonCarModelsPage() {
	const navigate = useNavigate();
	const params = useParams();
	const seasonId = Number(params.seasonId);
	const [seasonName, setSeasonName] = useState<string>("");
	const [seasonCarModels, setSeasonCarModelsState] = useState<
		SeasonCarModelRow[]
	>([]);
	const [allCarModelOptions, setAllCarModelOptions] = useState<
		CarModelOption[]
	>([]);
	const [selectedCarModelId, setSelectedCarModelId] = useState<number | null>(
		null,
	);
	const [isLoading, setIsLoading] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [persistedIds, setPersistedIds] = useState<number[]>([]);

	const isValidSeasonId = Number.isFinite(seasonId) && seasonId > 0;

	const loadData = useCallback(async () => {
		if (!isValidSeasonId) {
			return;
		}

		setIsLoading(true);
		try {
			const [season, selectedItems, allOptions] = await Promise.all([
				getSeason(seasonId),
				listSeasonCarModels(seasonId),
				listAllCarModelOptions(),
			]);

			setSeasonName(season?.name ?? `Season #${seasonId}`);
			setAllCarModelOptions(allOptions);

			const labelById = new Map(
				allOptions.map((option) => [option.carModelId, option.label]),
			);
			const nextRows = selectedItems.map((item) => ({
				id: item.id,
				name:
					labelById.get(item.id) ??
					item.name?.trim() ??
					`Car model #${item.id}`,
			}));
			setSeasonCarModelsState(nextRows);
			setPersistedIds(nextRows.map((item) => item.id));
		} catch (error) {
			void message.error(
				`Failed to load season car models: ${String(error)}`,
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

	const selectedIds = useMemo(
		() => seasonCarModels.map((item) => item.id),
		[seasonCarModels],
	);

	const availableOptions = useMemo(
		() =>
			allCarModelOptions
				.filter((option) => !selectedIds.includes(option.carModelId))
				.map((option) => ({
					value: option.carModelId,
					label: option.label,
				})),
		[allCarModelOptions, selectedIds],
	);

	const handleAdd = useCallback(() => {
		if (selectedCarModelId === null) {
			void message.warning("Select a car model to add.");
			return;
		}
		if (selectedIds.includes(selectedCarModelId)) {
			void message.warning("Car model already exists for this season.");
			return;
		}

		const selectedOption = allCarModelOptions.find(
			(item) => item.carModelId === selectedCarModelId,
		);
		if (!selectedOption) {
			void message.error("Selected car model was not found.");
			return;
		}

		setSeasonCarModelsState((current) => [
			...current,
			{
				id: selectedOption.carModelId,
				name: selectedOption.label,
			},
		]);
		setSelectedCarModelId(null);
	}, [allCarModelOptions, selectedCarModelId, selectedIds]);

	const handleRemove = useCallback((carModelId: number) => {
		setSeasonCarModelsState((current) =>
			current.filter((item) => item.id !== carModelId),
		);
	}, []);

	const moveRow = useCallback((fromIndex: number, toIndex: number) => {
		setSeasonCarModelsState((current) => {
			if (
				fromIndex < 0 ||
				toIndex < 0 ||
				fromIndex >= current.length ||
				toIndex >= current.length ||
				fromIndex === toIndex
			) {
				return current;
			}

			const next = [...current];
			const [moved] = next.splice(fromIndex, 1);
			next.splice(toIndex, 0, moved);
			return next;
		});
	}, []);

	const isDirty = useMemo(() => {
		if (selectedIds.length !== persistedIds.length) {
			return true;
		}
		return selectedIds.some((id, index) => id !== persistedIds[index]);
	}, [persistedIds, selectedIds]);

	const handleSave = useCallback(async () => {
		setIsSaving(true);
		try {
			await setSeasonCarModels(seasonId, selectedIds);
			setPersistedIds(selectedIds);
			void message.success("Season car models saved.");
		} catch (error) {
			void message.error(
				`Failed to save season car models: ${String(error)}`,
			);
		} finally {
			setIsSaving(false);
		}
	}, [seasonId, selectedIds]);

	if (!isValidSeasonId) {
		return <Text type="danger">Invalid season id.</Text>;
	}

	return (
		<Space orientation="vertical" size={16} style={{ width: "100%" }}>
			<SeasonEntityBreadcrumbs
				seasonId={seasonId}
				seasonName={seasonName}
			/>
			<Space>
				<Button
					icon={<ArrowLeftOutlined />}
					onClick={() => navigate(`/seasons`)}
				>
					Back
				</Button>
				<Title level={2} style={{ margin: 0 }}>
					Season Cars
				</Title>
			</Space>

			<Card
				title={`Car Models for ${seasonName}`}
				extra={
					<Space>
						<Select
							showSearch
							allowClear
							placeholder="Select car model"
							style={{ minWidth: 320 }}
							value={selectedCarModelId ?? undefined}
							onChange={(value) =>
								setSelectedCarModelId(value ?? null)
							}
							options={availableOptions}
							optionFilterProp="label"
							filterOption={(input, option) =>
								String(option?.label ?? "")
									.toLowerCase()
									.includes(input.toLowerCase())
							}
						/>
						<Button
							icon={<PlusOutlined />}
							onClick={handleAdd}
							disabled={isSaving}
						>
							Add
						</Button>
						<Button
							type="primary"
							icon={<SaveOutlined />}
							onClick={() => void handleSave()}
							loading={isSaving}
							disabled={!isDirty}
						>
							Save
						</Button>
						<Button
							icon={<ReloadOutlined />}
							onClick={() => void loadData()}
							loading={isLoading}
							disabled={isSaving}
						>
							Refresh
						</Button>
					</Space>
				}
			>
				<Table<SeasonCarModelRow>
					rowKey={(row) => row.id}
					loading={isLoading || isSaving}
					dataSource={seasonCarModels}
					pagination={{ defaultPageSize: 20, showSizeChanger: true }}
					onRow={(_, index) => ({
						draggable: !isSaving,
						onDragStart: (event) => {
							event.dataTransfer.effectAllowed = "move";
							event.dataTransfer.setData(
								"text/plain",
								String(index),
							);
						},
						onDragOver: (event) => {
							event.preventDefault();
							event.dataTransfer.dropEffect = "move";
						},
						onDrop: (event) => {
							event.preventDefault();
							const fromIndex = Number.parseInt(
								event.dataTransfer.getData("text/plain"),
								10,
							);
							if (
								Number.isInteger(fromIndex) &&
								index !== undefined
							) {
								moveRow(fromIndex, index);
							}
						},
					})}
					columns={[
						{
							title: "",
							key: "drag",
							width: 40,
							render: () => (
								<HolderOutlined style={{ cursor: "grab" }} />
							),
						},
						{
							title: "#",
							key: "position",
							width: 72,
							render: (_, __, index) => index + 1,
						},
						{
							title: "Car Model",
							dataIndex: "name",
							key: "name",
						},
						{
							title: "Actions",
							key: "actions",
							render: (_, row) => (
								<Space size={4}>
									<Popconfirm
										title="Remove car model"
										description={`Remove ${row.name} from this season?`}
										onConfirm={() => handleRemove(row.id)}
										okText="Remove"
										okButtonProps={{ danger: true }}
									>
										<Button
											size="small"
											type="text"
											icon={<DeleteOutlined />}
											disabled={isSaving}
										>
											Remove
										</Button>
									</Popconfirm>
								</Space>
							),
						},
					]}
				/>
			</Card>
		</Space>
	);
}
