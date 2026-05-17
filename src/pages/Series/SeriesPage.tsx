import {
	createSeries,
	deleteSeries,
	listSeries,
	updateSeries,
	type UpsertSeriesInput,
} from "@/api/series";
import { listSimulations } from "@/api/simulations";
import {
	DeleteOutlined,
	PlusOutlined,
	ReloadOutlined,
	SaveOutlined,
} from "@ant-design/icons";
import type {
	Series,
	Simulation,
} from "@buf/srlmgr_api.bufbuild_es/backend/common/v1/common_pb";
import {
	Alert,
	Button,
	Card,
	Col,
	Empty,
	Form,
	Input,
	List,
	Popconfirm,
	Row,
	Select,
	Space,
	Switch,
	Typography,
	message,
} from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";

const { Title, Text } = Typography;

type SeriesFormValues = {
	name: string;
	description: string;
	isActive: boolean;
};

const NEW_SERIES_DEFAULTS: SeriesFormValues = {
	name: "",
	description: "",
	isActive: true,
};

function toFormValues(series: Series): SeriesFormValues {
	return {
		name: series.name,
		description: series.description,
		isActive: series.isActive,
	};
}

export function SeriesPage() {
	const [form] = Form.useForm<SeriesFormValues>();
	const [simulations, setSimulations] = useState<Simulation[]>([]);
	const [selectedSimulationId, setSelectedSimulationId] = useState<
		number | null
	>(null);
	const [seriesItems, setSeriesItems] = useState<Series[]>([]);
	const [selectedSeriesId, setSelectedSeriesId] = useState<number | null>(
		null,
	);
	const [isCreatingNew, setIsCreatingNew] = useState(false);
	const [isSimulationsLoading, setIsSimulationsLoading] = useState(false);
	const [isSeriesLoading, setIsSeriesLoading] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [grpcError, setGrpcError] = useState<string | null>(null);

	const selectedSeries = useMemo(
		() => seriesItems.find((series) => series.id === selectedSeriesId),
		[seriesItems, selectedSeriesId],
	);

	const loadSimulations = useCallback(async () => {
		setIsSimulationsLoading(true);
		try {
			const items = await listSimulations();
			setSimulations(items);
			setGrpcError(null);

			setSelectedSimulationId((current) => {
				if (
					current !== null &&
					items.some((item) => item.id === current)
				) {
					return current;
				}
				return items[0]?.id ?? null;
			});
		} catch (error) {
			const errorMessage = `Failed to load simulations: ${String(error)}`;
			setGrpcError(errorMessage);
			void message.error(errorMessage);
		} finally {
			setIsSimulationsLoading(false);
		}
	}, []);

	const loadSeriesForSimulation = useCallback(
		async (simulationId: number, nextSelectedId?: number | null) => {
			setIsSeriesLoading(true);
			try {
				const items = await listSeries(simulationId);
				setSeriesItems(items);
				setGrpcError(null);

				if (nextSelectedId !== undefined) {
					setSelectedSeriesId(
						items.some((item) => item.id === nextSelectedId)
							? nextSelectedId
							: null,
					);
					return;
				}

				setSelectedSeriesId((currentSelectedId) => {
					if (currentSelectedId === null) {
						return null;
					}
					return items.some((item) => item.id === currentSelectedId)
						? currentSelectedId
						: null;
				});
			} catch (error) {
				const errorMessage = `Failed to load series: ${String(error)}`;
				setGrpcError(errorMessage);
				void message.error(errorMessage);
			} finally {
				setIsSeriesLoading(false);
			}
		},
		[],
	);

	useEffect(() => {
		const timeoutId = window.setTimeout(() => {
			void loadSimulations();
		}, 0);

		return () => {
			window.clearTimeout(timeoutId);
		};
	}, [loadSimulations]);

	useEffect(() => {
		const timeoutId = window.setTimeout(() => {
			if (selectedSimulationId === null) {
				setSeriesItems([]);
				setSelectedSeriesId(null);
				setIsCreatingNew(false);
				form.resetFields();
				return;
			}

			setIsCreatingNew(false);
			setSelectedSeriesId(null);
			void loadSeriesForSimulation(selectedSimulationId, null);
		}, 0);

		return () => {
			window.clearTimeout(timeoutId);
		};
	}, [form, loadSeriesForSimulation, selectedSimulationId]);

	useEffect(() => {
		if (isCreatingNew) {
			form.setFieldsValue(NEW_SERIES_DEFAULTS);
			return;
		}

		if (!selectedSeries) {
			form.resetFields();
			return;
		}

		form.setFieldsValue(toFormValues(selectedSeries));
	}, [form, isCreatingNew, selectedSeries]);

	const handleSelectSimulation = (simulationId: number) => {
		setSelectedSimulationId(simulationId);
	};

	const handleSelectSeries = (seriesId: number) => {
		setIsCreatingNew(false);
		setSelectedSeriesId(seriesId);
	};

	const handleNewSeries = () => {
		if (selectedSimulationId === null) {
			void message.warning("Select a simulation first.");
			return;
		}

		setIsCreatingNew(true);
		setSelectedSeriesId(null);
		form.setFieldsValue(NEW_SERIES_DEFAULTS);
	};

	const handleCancelNewSeries = () => {
		setIsCreatingNew(false);
		if (seriesItems.length > 0) {
			setSelectedSeriesId(seriesItems[0].id);
		} else {
			setSelectedSeriesId(null);
			form.resetFields();
		}
	};

	const handleRefresh = async () => {
		if (selectedSimulationId === null) {
			void loadSimulations();
			return;
		}

		await loadSeriesForSimulation(selectedSimulationId, selectedSeriesId);
	};

	const handleSave = async () => {
		if (selectedSimulationId === null) {
			void message.warning("Select a simulation first.");
			return;
		}

		try {
			const values = await form.validateFields();
			setIsSaving(true);

			const input: UpsertSeriesInput = {
				simulationId: selectedSimulationId,
				name: values.name,
				description: values.description,
				isActive: values.isActive,
			};

			if (isCreatingNew) {
				const createdSeries = await createSeries(input);
				setIsCreatingNew(false);
				await loadSeriesForSimulation(
					selectedSimulationId,
					createdSeries?.id ?? null,
				);
				setGrpcError(null);
				void message.success("Series created.");
				return;
			}

			if (!selectedSeries) {
				void message.warning("Select a series first.");
				return;
			}

			await updateSeries(selectedSeries.id, input);
			await loadSeriesForSimulation(
				selectedSimulationId,
				selectedSeries.id,
			);
			setGrpcError(null);
			void message.success("Series updated.");
		} catch (error) {
			if (
				typeof error === "object" &&
				error !== null &&
				"errorFields" in error
			) {
				return;
			}

			const errorMessage = `Failed to save series: ${String(error)}`;
			setGrpcError(errorMessage);
			void message.error(errorMessage);
		} finally {
			setIsSaving(false);
		}
	};

	const handleDelete = async () => {
		if (!selectedSeries || selectedSimulationId === null) {
			return;
		}

		setIsDeleting(true);
		try {
			const deleted = await deleteSeries(selectedSeries.id);
			if (!deleted) {
				const errorMessage = "Series was not deleted by backend.";
				setGrpcError(errorMessage);
				void message.warning(errorMessage);
				return;
			}

			setIsCreatingNew(false);
			await loadSeriesForSimulation(selectedSimulationId, null);
			setGrpcError(null);
			void message.success("Series deleted.");
		} catch (error) {
			const errorMessage = `Failed to delete series: ${String(error)}`;
			setGrpcError(errorMessage);
			void message.error(errorMessage);
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<>
			<Space orientation="vertical" size={16} style={{ width: "100%" }}>
				<Title level={2} style={{ margin: 0 }}>
					Series
				</Title>

				<Row gutter={16}>
					<Col xs={24} md={9}>
						<Card
							title="Series"
							extra={
								<Space>
									<Button
										icon={<PlusOutlined />}
										onClick={handleNewSeries}
										disabled={selectedSimulationId === null}
									>
										New
									</Button>
									<Button
										icon={<ReloadOutlined />}
										onClick={() => void handleRefresh()}
										loading={
											isSeriesLoading ||
											isSimulationsLoading
										}
									>
										Refresh
									</Button>
								</Space>
							}
						>
							<Form
								layout="vertical"
								style={{ marginBottom: 12 }}
							>
								<Form.Item
									label="Simulation"
									style={{ marginBottom: 0 }}
								>
									<Select
										placeholder="Select simulation"
										loading={isSimulationsLoading}
										value={
											selectedSimulationId ?? undefined
										}
										onChange={handleSelectSimulation}
										options={simulations.map(
											(simulation) => ({
												value: simulation.id,
												label: simulation.name,
											}),
										)}
									/>
								</Form.Item>
							</Form>

							{selectedSimulationId === null ? (
								<Empty description="Select a simulation to load series." />
							) : (
								<List
									loading={isSeriesLoading}
									dataSource={seriesItems}
									locale={{ emptyText: "No series found" }}
									renderItem={(series) => {
										const isSelected =
											!isCreatingNew &&
											series.id === selectedSeriesId;
										return (
											<List.Item
												style={{
													cursor: "pointer",
													paddingInline: 12,
													borderRadius: 6,
													backgroundColor: isSelected
														? "#e6f4ff"
														: "transparent",
												}}
												onClick={() =>
													handleSelectSeries(
														series.id,
													)
												}
											>
												<List.Item.Meta
													title={series.name}
													description={
														series.isActive
															? "Active"
															: "Inactive"
													}
												/>
											</List.Item>
										);
									}}
								/>
							)}
						</Card>
					</Col>

					<Col xs={24} md={15}>
						<Card
							title={
								isCreatingNew
									? "New Series"
									: selectedSeries
										? `Series #${selectedSeries.id}`
										: "Series Details"
							}
						>
							{!isCreatingNew && !selectedSeries ? (
								<Empty description="Select a series from the list, or click New." />
							) : (
								<Form
									form={form}
									layout="vertical"
									initialValues={NEW_SERIES_DEFAULTS}
								>
									{grpcError ? (
										<Alert
											type="error"
											showIcon
											message={grpcError}
											style={{ marginBottom: 16 }}
										/>
									) : null}

									<Form.Item
										label="Name"
										name="name"
										rules={[
											{
												required: true,
												message:
													"Please enter series name",
											},
										]}
									>
										<Input placeholder="Formula Sprint" />
									</Form.Item>

									<Form.Item
										label="Description"
										name="description"
									>
										<Input.TextArea
											placeholder="Describe this series"
											autoSize={{
												minRows: 3,
												maxRows: 6,
											}}
										/>
									</Form.Item>

									<Form.Item
										label="Active"
										name="isActive"
										valuePropName="checked"
									>
										<Switch
											checkedChildren="Yes"
											unCheckedChildren="No"
										/>
									</Form.Item>

									<Space wrap>
										<Button
											type="primary"
											icon={<SaveOutlined />}
											onClick={() => void handleSave()}
											loading={isSaving}
										>
											Save
										</Button>

										{isCreatingNew ? (
											<Button
												onClick={handleCancelNewSeries}
											>
												Cancel
											</Button>
										) : (
											<Popconfirm
												title="Delete this series?"
												description="This action cannot be undone."
												onConfirm={() =>
													void handleDelete()
												}
												okButtonProps={{
													loading: isDeleting,
												}}
											>
												<Button
													danger
													icon={<DeleteOutlined />}
													disabled={!selectedSeries}
												>
													Delete
												</Button>
											</Popconfirm>
										)}
									</Space>
								</Form>
							)}
						</Card>
					</Col>
				</Row>

				<Text type="secondary">
					Select a simulation on the left to filter available series.
				</Text>
			</Space>
		</>
	);
}
