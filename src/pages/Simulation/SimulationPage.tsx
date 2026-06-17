import {
	AVAILABLE_IMPORT_FORMATS,
	createSimulation,
	deleteSimulation,
	listSimulations,
	updateSimulation,
	type UpsertSimulationInput,
} from "@/api/simulations";
import {
	DeleteOutlined,
	PlusOutlined,
	ReloadOutlined,
	SaveOutlined,
} from "@ant-design/icons";
import type { Simulation } from "@buf/srlmgr_api.bufbuild_es/backend/common/v1/common_pb";
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
	theme,
} from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";

const { Title, Text } = Typography;

type ImportConfigForm = UpsertSimulationInput["supportedFormats"][number];

type SimulationFormValues = {
	name: string;
	isActive: boolean;
	supportedFormats: ImportConfigForm[];
};

const NEW_SIMULATION_DEFAULTS: SimulationFormValues = {
	name: "",
	isActive: true,
	supportedFormats: [],
};

function toFormValues(simulation: Simulation): SimulationFormValues {
	return {
		name: simulation.name,
		isActive: simulation.isActive,
		supportedFormats: simulation.supportedFormats.map((config) => ({
			format: config.format,
			allowMultipleUploads: config.allowMultipleUploads,
		})),
	};
}

export function SimulationPage() {
	const [form] = Form.useForm<SimulationFormValues>();
	const {
		token: { colorBorder, colorFillAlter, colorPrimaryBg, colorSplit },
	} = theme.useToken();
	const [simulations, setSimulations] = useState<Simulation[]>([]);
	const [selectedId, setSelectedId] = useState<number | null>(null);
	const [isCreatingNew, setIsCreatingNew] = useState(false);
	const [isListLoading, setIsListLoading] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [grpcError, setGrpcError] = useState<string | null>(null);

	const selectedSimulation = useMemo(
		() => simulations.find((simulation) => simulation.id === selectedId),
		[simulations, selectedId],
	);

	const loadSimulations = useCallback(
		async (nextSelectedId?: number | null) => {
			setIsListLoading(true);
			try {
				const items = await listSimulations();
				setSimulations(items);
				setGrpcError(null);

				if (nextSelectedId !== undefined) {
					setSelectedId(
						items.some((item) => item.id === nextSelectedId)
							? nextSelectedId
							: null,
					);
					return;
				}

				setSelectedId((currentSelectedId) => {
					if (currentSelectedId === null) {
						return null;
					}
					return items.some((item) => item.id === currentSelectedId)
						? currentSelectedId
						: null;
				});
			} catch (error) {
				const errorMessage = `Failed to load simulations: ${String(error)}`;
				setGrpcError(errorMessage);
				void message.error(errorMessage);
			} finally {
				setIsListLoading(false);
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
		if (isCreatingNew) {
			form.setFieldsValue(NEW_SIMULATION_DEFAULTS);
			return;
		}

		if (!selectedSimulation) {
			form.resetFields();
			return;
		}

		form.setFieldsValue(toFormValues(selectedSimulation));
	}, [form, isCreatingNew, selectedSimulation]);

	const handleSelectSimulation = (simulationId: number) => {
		setIsCreatingNew(false);
		setSelectedId(simulationId);
	};

	const handleNewSimulation = () => {
		setIsCreatingNew(true);
		setSelectedId(null);
		form.setFieldsValue(NEW_SIMULATION_DEFAULTS);
	};

	const handleCancelNewSimulation = () => {
		setIsCreatingNew(false);
		if (simulations.length > 0) {
			setSelectedId(simulations[0].id);
		} else {
			setSelectedId(null);
			form.resetFields();
		}
	};

	const handleRefresh = async () => {
		await loadSimulations(selectedId);
	};

	const handleSave = async () => {
		try {
			const values = await form.validateFields();
			setIsSaving(true);

			if (isCreatingNew) {
				const createdSimulation = await createSimulation(values);
				setIsCreatingNew(false);
				await loadSimulations(createdSimulation?.id ?? null);
				setGrpcError(null);
				void message.success("Simulation created.");
				return;
			}

			if (!selectedSimulation) {
				void message.warning("Select a simulation first.");
				return;
			}

			await updateSimulation(selectedSimulation.id, values);
			await loadSimulations(selectedSimulation.id);
			setGrpcError(null);
			void message.success("Simulation updated.");
		} catch (error) {
			if (
				typeof error === "object" &&
				error !== null &&
				"errorFields" in error
			) {
				return;
			}
			const errorMessage = `Failed to save simulation: ${String(error)}`;
			setGrpcError(errorMessage);
			void message.error(errorMessage);
		} finally {
			setIsSaving(false);
		}
	};

	const handleDelete = async () => {
		if (!selectedSimulation) {
			return;
		}

		setIsDeleting(true);
		try {
			const deleted = await deleteSimulation(selectedSimulation.id);
			if (!deleted) {
				const errorMessage = "Simulation was not deleted by backend.";
				setGrpcError(errorMessage);
				void message.warning(errorMessage);
				return;
			}

			await loadSimulations(null);
			setIsCreatingNew(false);
			setGrpcError(null);
			void message.success("Simulation deleted.");
		} catch (error) {
			const errorMessage = `Failed to delete simulation: ${String(error)}`;
			setGrpcError(errorMessage);
			void message.error(errorMessage);
		} finally {
			setIsDeleting(false);
		}
	};

	const importFormats = Form.useWatch("supportedFormats", form) ?? [];

	return (
		<>
			<Space orientation="vertical" size={16} style={{ width: "100%" }}>
				<Title level={2} style={{ margin: 0 }}>
					Simulations
				</Title>

				<Row gutter={16}>
					<Col xs={24} md={9}>
						<Card
							title="All Simulations"
							extra={
								<Space>
									<Button
										icon={<PlusOutlined />}
										onClick={handleNewSimulation}
									>
										New
									</Button>
									<Button
										icon={<ReloadOutlined />}
										onClick={() => void handleRefresh()}
										loading={isListLoading}
									>
										Refresh
									</Button>
								</Space>
							}
						>
							<List
								loading={isListLoading}
								dataSource={simulations}
								locale={{ emptyText: "No simulations found" }}
								renderItem={(simulation) => {
									const isSelected =
										!isCreatingNew &&
										simulation.id === selectedId;
									return (
										<List.Item
											style={{
												cursor: "pointer",
												paddingInline: 12,
												borderRadius: 6,
												backgroundColor: isSelected
													? colorPrimaryBg
													: "transparent",
											}}
											onClick={() =>
												handleSelectSimulation(
													simulation.id,
												)
											}
										>
											<List.Item.Meta
												title={simulation.name}
												description={
													simulation.isActive
														? "Active"
														: "Inactive"
												}
											/>
										</List.Item>
									);
								}}
							/>
						</Card>
					</Col>

					<Col xs={24} md={15}>
						<Card
							title={
								isCreatingNew
									? "New Simulation"
									: selectedSimulation
										? `Simulation #${selectedSimulation.id}`
										: "Simulation Details"
							}
						>
							{!isCreatingNew && !selectedSimulation ? (
								<Empty description="Select a simulation from the list, or click New." />
							) : (
								<Form
									form={form}
									layout="vertical"
									initialValues={NEW_SIMULATION_DEFAULTS}
								>
									{grpcError ? (
										<Alert
											type="error"
											showIcon
											closable={{
												closeIcon: true,
												onClose: () =>
													setGrpcError(null),
											}}
											title={grpcError}
											style={{ marginBottom: 16 }}
										/>
									) : null}

									<Form.Item
										label="Name"
										name="name"
										rules={[
											{
												required: true,
												message: "Name is required",
											},
										]}
									>
										<Input placeholder="Simulation name" />
									</Form.Item>

									<Form.Item
										label="Active"
										name="isActive"
										valuePropName="checked"
									>
										<Switch />
									</Form.Item>

									<Space
										orientation="vertical"
										style={{ width: "100%" }}
										size={12}
									>
										<Text strong>Import Configs</Text>
										<Form.List name="supportedFormats">
											{(fields, { add, remove }) => (
												<Space
													orientation="vertical"
													style={{ width: "100%" }}
													size={12}
												>
													<div
														style={{
															border: `1px solid ${colorBorder}`,
															borderRadius: 8,
															overflow: "hidden",
														}}
													>
														<Row
															gutter={12}
															style={{
																margin: 0,
																padding:
																	"10px 12px",
																background:
																	colorFillAlter,
																borderBottom:
																	fields.length >
																	0
																		? `1px solid ${colorSplit}`
																		: "none",
															}}
														>
															<Col span={13}>
																<Text strong>
																	Format
																</Text>
															</Col>
															<Col span={8}>
																<Text strong>
																	Multiple
																	Uploads
																</Text>
															</Col>
															<Col span={3}>
																<Text strong>
																	Action
																</Text>
															</Col>
														</Row>

														{fields.length === 0 ? (
															<div
																style={{
																	padding: 12,
																}}
															>
																<Text type="secondary">
																	No import
																	formats
																	configured.
																</Text>
															</div>
														) : null}

														{fields.map(
															(field, index) => {
																const selectedByOthers =
																	new Set(
																		importFormats
																			.filter(
																				(
																					_,
																					formatIndex,
																				) =>
																					formatIndex !==
																					index,
																			)
																			.map(
																				(
																					config,
																				) =>
																					config?.format,
																			)
																			.filter(
																				(
																					value,
																				): value is number =>
																					value !==
																					undefined,
																			),
																	);

																return (
																	<Row
																		key={
																			field.key
																		}
																		gutter={
																			12
																		}
																		align="middle"
																		style={{
																			margin: 0,
																			padding:
																				"10px 12px",
																			borderTop:
																				index >
																				0
																					? `1px solid ${colorSplit}`
																					: "none",
																		}}
																	>
																		<Col
																			span={
																				13
																			}
																		>
																			<Form.Item
																				name={[
																					field.name,
																					"format",
																				]}
																				rules={[
																					{
																						required: true,
																						message:
																							"Format is required",
																					},
																				]}
																				style={{
																					marginBottom: 0,
																				}}
																			>
																				<Select
																					placeholder="Select format"
																					options={AVAILABLE_IMPORT_FORMATS.map(
																						(
																							option,
																						) => ({
																							...option,
																							disabled:
																								selectedByOthers.has(
																									option.value,
																								),
																						}),
																					)}
																				/>
																			</Form.Item>
																		</Col>

																		<Col
																			span={
																				8
																			}
																		>
																			<Form.Item
																				name={[
																					field.name,
																					"allowMultipleUploads",
																				]}
																				valuePropName="checked"
																				initialValue={
																					false
																				}
																				style={{
																					marginBottom: 0,
																				}}
																			>
																				<Switch />
																			</Form.Item>
																		</Col>

																		<Col
																			span={
																				3
																			}
																		>
																			<Button
																				danger
																				icon={
																					<DeleteOutlined />
																				}
																				onClick={() =>
																					remove(
																						field.name,
																					)
																				}
																			/>
																		</Col>
																	</Row>
																);
															},
														)}
													</div>

													<Button
														type="dashed"
														onClick={() =>
															add({
																allowMultipleUploads: false,
															})
														}
														icon={<PlusOutlined />}
													>
														Add format
													</Button>
												</Space>
											)}
										</Form.List>
									</Space>

									<Space style={{ marginTop: 20 }}>
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
												onClick={
													handleCancelNewSimulation
												}
											>
												Cancel
											</Button>
										) : (
											<Popconfirm
												title="Delete simulation"
												description="Are you sure you want to delete this simulation?"
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
													loading={isDeleting}
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
			</Space>
		</>
	);
}
