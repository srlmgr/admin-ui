import {
	createCarModel,
	deleteCarModel,
	getCarModel,
	updateCarModel,
	type SimulationAliasesInput,
} from "@/api/cars";
import { DeleteOutlined, PlusOutlined, SaveOutlined } from "@ant-design/icons";
import type {
	CarModel,
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
	Space,
	Spin,
	Tooltip,
	Typography,
	message,
} from "antd";
import { useEffect, useMemo, useState } from "react";

const { Text } = Typography;

type ModelFormValues = {
	name: string;
};

interface ModelEditorSectionProps {
	selectedBrandId: number | null;
	selectedModelId: number | null;
	simulations: Simulation[];
	selectedSimulationId: number | null;
	onSelectSimulation: (id: number) => void;
	isCreating: boolean;
	filteredModels: CarModel[];
	selectedManufacturerId: number | null;
	onCreated: () => Promise<void>;
	onUpdated: () => Promise<void>;
	onDeleted: () => Promise<void>;
}

const createAliasState = (
	simulations: Simulation[],
	aliases: SimulationAliasesInput[] = [],
): Record<number, string[]> => {
	const bySimulationId: Record<number, string[]> = {};
	for (const simulation of simulations) {
		bySimulationId[simulation.id] = [];
	}
	for (const alias of aliases) {
		bySimulationId[alias.simulationId] = [...alias.identifiers];
	}
	return bySimulationId;
};

export function ModelEditorSection({
	selectedBrandId,
	selectedModelId,
	simulations,
	selectedSimulationId,
	onSelectSimulation,
	isCreating,
	filteredModels,
	selectedManufacturerId,
	onCreated,
	onUpdated,
	onDeleted,
}: ModelEditorSectionProps) {
	const [form] = Form.useForm<ModelFormValues>();
	const [modelAliases, setModelAliases] = useState<Record<number, string[]>>(
		createAliasState(simulations),
	);
	const [isLoading, setIsLoading] = useState(false);

	const selectedModel = filteredModels.find(
		(item) => item.id === selectedModelId,
	);
	const sortedSimulations = useMemo(
		() => [...simulations].sort((a, b) => a.name.localeCompare(b.name)),
		[simulations],
	);
	const currentAliases =
		selectedSimulationId === null
			? []
			: (modelAliases[selectedSimulationId] ?? []);

	useEffect(() => {
		if (isCreating) {
			form.setFieldsValue({ name: "" });
			return;
		}

		if (selectedModelId === null) {
			form.resetFields();
			// Defer alias reset to avoid setState in effect
			const timeoutId = window.setTimeout(() => {
				setModelAliases(createAliasState(simulations));
			}, 0);
			return () => window.clearTimeout(timeoutId);
		}

		const loadModelDetails = async () => {
			setIsLoading(true);
			try {
				const response = await getCarModel(selectedModelId);
				if (!response.carModel) {
					form.resetFields();
					setModelAliases(createAliasState(simulations));
					return;
				}

				form.setFieldsValue({ name: response.carModel.name });
				setModelAliases(
					createAliasState(simulations, response.simulationAliases),
				);
			} catch (error) {
				const errorMessage = `Failed to load car model: ${String(error)}`;
				void message.error(errorMessage);
			} finally {
				setIsLoading(false);
			}
		};

		void loadModelDetails();
	}, [isCreating, selectedModelId, simulations, form]);

	useEffect(() => {
		if (isCreating) {
			const timeoutId = window.setTimeout(() => {
				setModelAliases(createAliasState(simulations));
			}, 0);
			return () => window.clearTimeout(timeoutId);
		}
	}, [isCreating, simulations]);

	const handleSave = async () => {
		if (selectedBrandId === null || selectedManufacturerId === null) {
			void message.warning("Select a brand first.");
			return;
		}

		try {
			const values = await form.validateFields();

			const simulationAliases: SimulationAliasesInput[] = simulations.map(
				(simulation) => ({
					simulationId: simulation.id,
					identifiers: (modelAliases[simulation.id] ?? [])
						.map((item) => item.trim())
						.filter((item) => item.length > 0),
				}),
			);

			if (isCreating) {
				await createCarModel({
					brandId: selectedBrandId,
					name: values.name,
					simulationAliases,
				});
				void message.success("Model created.");
				await onCreated();
				return;
			}

			if (selectedModelId === null) {
				void message.warning("Select a model first.");
				return;
			}

			await updateCarModel(selectedModelId, {
				brandId: selectedBrandId,
				name: values.name,
				simulationAliases,
			});
			void message.success("Model updated.");
			await onUpdated();
		} catch (error) {
			if (
				typeof error === "object" &&
				error !== null &&
				"errorFields" in error
			) {
				return;
			}
			const errorMessage = `Failed to save model: ${String(error)}`;
			void message.error(errorMessage);
		}
	};

	const handleDelete = async () => {
		if (selectedModelId === null) {
			return;
		}

		try {
			const deleted = await deleteCarModel(selectedModelId);
			if (!deleted) {
				void message.warning("Model was not deleted by backend.");
				return;
			}
			void message.success("Model deleted.");
			await onDeleted();
		} catch (error) {
			const errorMessage = `Failed to delete model: ${String(error)}`;

			void message.error(errorMessage);
		}
	};

	const handleAliasChange = (index: number, value: string) => {
		if (selectedSimulationId === null) return;
		setModelAliases((current) => {
			const next = { ...current };
			const aliases = [...(next[selectedSimulationId] ?? [])];
			aliases[index] = value;
			next[selectedSimulationId] = aliases;
			return next;
		});
	};

	const handleAddAlias = () => {
		if (selectedSimulationId === null) return;
		setModelAliases((current) => ({
			...current,
			[selectedSimulationId]: [
				...(current[selectedSimulationId] ?? []),
				"",
			],
		}));
	};

	const handleRemoveAlias = (index: number) => {
		if (selectedSimulationId === null) return;
		setModelAliases((current) => ({
			...current,
			[selectedSimulationId]: (
				current[selectedSimulationId] ?? []
			).filter((_, aliasIndex) => aliasIndex !== index),
		}));
	};

	return (
		<Card
			title={
				isCreating
					? "Create Model"
					: selectedModel
						? `Edit Model: ${selectedModel.name}`
						: "Model Details"
			}
		>
			{selectedBrandId === null && !isCreating ? (
				<Empty description="Select a brand to manage models" />
			) : !isCreating && selectedModelId === null ? (
				<Empty description="Select a model or create a new one" />
			) : (
				<Spin spinning={isLoading}>
					<Form form={form} layout="vertical">
						<Form.Item
							label="Model Name"
							name="name"
							rules={[
								{
									required: true,
									message: "Please enter a model name",
								},
							]}
						>
							<Input placeholder="e.g., GT3 R" />
						</Form.Item>

						{simulations.length > 0 ? (
							<div
								style={{
									marginTop: 24,
									borderTop: "1px solid #f0f0f0",
									paddingTop: 24,
								}}
							>
								<Space
									orientation="vertical"
									size={12}
									style={{ width: "100%" }}
								>
									<Text strong>Simulation Identifiers</Text>
									<Row gutter={16}>
										<Col xs={24} md={8}>
											<List
												size="small"
												dataSource={sortedSimulations}
												renderItem={(simulation) => (
													<List.Item
														style={{
															cursor: "pointer",
															backgroundColor:
																selectedSimulationId ===
																simulation.id
																	? "#e6f7ff"
																	: "transparent",
															paddingInline: 8,
															borderRadius: 6,
														}}
														onClick={() =>
															onSelectSimulation(
																simulation.id,
															)
														}
													>
														<List.Item.Meta
															title={
																simulation.name
															}
															description={`${(modelAliases[simulation.id] ?? []).length} identifier(s)`}
														/>
													</List.Item>
												)}
											/>
										</Col>
										<Col xs={24} md={16}>
											{selectedSimulationId === null ? (
												<Empty description="Select a simulation" />
											) : (
												<Space
													orientation="vertical"
													size={8}
													style={{ width: "100%" }}
												>
													{currentAliases.length ===
													0 ? (
														<Text type="secondary">
															No identifiers
															configured.
														</Text>
													) : (
														currentAliases.map(
															(alias, index) => (
																<div
																	key={`${selectedSimulationId}-${index}`}
																	style={{
																		width: "100%",
																		display:
																			"flex",
																		gap: 8,
																		alignItems:
																			"center",
																	}}
																>
																	<Input
																		value={
																			alias
																		}
																		onChange={(
																			event,
																		) =>
																			handleAliasChange(
																				index,
																				event
																					.target
																					.value,
																			)
																		}
																		placeholder="External identifier"
																		style={{
																			flex: 1,
																		}}
																	/>
																	<Tooltip title="Delete identifier">
																		<Button
																			danger
																			type="text"
																			icon={
																				<DeleteOutlined />
																			}
																			onClick={() =>
																				handleRemoveAlias(
																					index,
																				)
																			}
																		/>
																	</Tooltip>
																</div>
															),
														)
													)}
													<Button
														type="dashed"
														icon={<PlusOutlined />}
														onClick={() =>
															handleAddAlias()
														}
													>
														Add Identifier
													</Button>
												</Space>
											)}
										</Col>
									</Row>
								</Space>
							</div>
						) : (
							<Alert
								showIcon
								type="info"
								message="No simulations available"
								description="Create simulations first to configure model identifiers."
							/>
						)}

						<Space style={{ marginTop: 24 }}>
							<Button
								type="primary"
								icon={<SaveOutlined />}
								onClick={() => void handleSave()}
							>
								{isCreating ? "Create Model" : "Update Model"}
							</Button>
							{isCreating ? (
								<Button
									onClick={() => {
										form.resetFields();
										setModelAliases(
											createAliasState(simulations),
										);
									}}
								>
									Cancel
								</Button>
							) : (
								<Popconfirm
									title="Delete Model"
									description="Delete selected model?"
									onConfirm={() => void handleDelete()}
									okText="Yes"
									cancelText="No"
									disabled={selectedModelId === null}
								>
									<Button
										danger
										icon={<DeleteOutlined />}
										disabled={selectedModelId === null}
									>
										Delete
									</Button>
								</Popconfirm>
							)}
						</Space>
					</Form>
				</Spin>
			)}
		</Card>
	);
}
