import {
	createDriver,
	deleteDriver,
	getDriver,
	listDrivers,
	setSimulationDriverAliases,
	updateDriver,
	type SimulationAliasInput,
	type UpsertDriverInput,
} from "@/api/drivers";
import { listSimulations } from "@/api/simulations";
import {
	DeleteOutlined,
	PlusOutlined,
	ReloadOutlined,
	SaveOutlined,
	SearchOutlined,
} from "@ant-design/icons";
import type {
	Driver,
	Simulation,
} from "@buf/srlmgr_api.bufbuild_es/backend/common/v1/common_pb";
import type { InputRef } from "antd";
import {
	Alert,
	Button,
	Card,
	Col,
	Empty,
	Form,
	Input,
	Popconfirm,
	Row,
	Select,
	Space,
	Switch,
	Table,
	Tag,
	Typography,
	message,
} from "antd";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const { Title, Text } = Typography;

type DriverFormValues = {
	name: string;
	externalId: string;
	isActive: boolean;
	simulationAliases: SimulationAliasInput[];
};

const NEW_DRIVER_DEFAULTS: DriverFormValues = {
	name: "",
	externalId: "",
	isActive: true,
	simulationAliases: [],
};

const EXTERNAL_ID_CHARS =
	"ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789";

function generateRandomExternalId(length = 10): string {
	let value = "";
	for (let i = 0; i < length; i += 1) {
		const randomIndex = Math.floor(
			Math.random() * EXTERNAL_ID_CHARS.length,
		);
		value += EXTERNAL_ID_CHARS[randomIndex];
	}
	return value;
}

function toFormValues(
	driver: Driver,
	aliases: SimulationAliasInput[] = [],
): DriverFormValues {
	return {
		name: driver.name,
		externalId: driver.externalId,
		isActive: driver.isActive,
		simulationAliases: aliases,
	};
}

export function DriversPage() {
	const [form] = Form.useForm<DriverFormValues>();
	const [drivers, setDrivers] = useState<Driver[]>([]);
	const [simulations, setSimulations] = useState<Simulation[]>([]);
	const [selectedId, setSelectedId] = useState<number | null>(null);
	const [isCreatingNew, setIsCreatingNew] = useState(false);
	const [isListLoading, setIsListLoading] = useState(false);
	const [isDriverLoading, setIsDriverLoading] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [grpcError, setGrpcError] = useState<string | null>(null);
	const [pendingAliasClears, setPendingAliasClears] = useState<number[]>([]);

	const selectedDriver = useMemo(
		() => drivers.find((driver) => driver.id === selectedId),
		[drivers, selectedId],
	);

	const loadDrivers = useCallback(async (nextSelectedId?: number | null) => {
		setIsListLoading(true);
		try {
			const items = await listDrivers();
			setDrivers(items);
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
			const errorMessage = `Failed to load drivers: ${String(error)}`;
			setGrpcError(errorMessage);
			void message.error(errorMessage);
		} finally {
			setIsListLoading(false);
		}
	}, []);

	useEffect(() => {
		const timeoutId = window.setTimeout(() => {
			void loadDrivers();
			void listSimulations()
				.then(setSimulations)
				.catch(() => {});
		}, 0);
		return () => {
			window.clearTimeout(timeoutId);
		};
	}, [loadDrivers]);

	useEffect(() => {
		if (isCreatingNew) {
			form.setFieldsValue(NEW_DRIVER_DEFAULTS);
			return;
		}

		if (selectedId === null) {
			form.resetFields();
		}
	}, [form, isCreatingNew, selectedId]);

	const handleSelectDriver = (driverId: number) => {
		setIsCreatingNew(false);
		setSelectedId(driverId);
	};

	const handleNewDriver = () => {
		setIsCreatingNew(true);
		setSelectedId(null);
		setPendingAliasClears([]);
		form.setFieldsValue(NEW_DRIVER_DEFAULTS);
	};

	const handleCancelNewDriver = () => {
		setIsCreatingNew(false);
		setPendingAliasClears([]);
		if (drivers.length > 0) {
			setSelectedId(drivers[0].id);
		} else {
			setSelectedId(null);
			form.resetFields();
		}
	};

	const handleRefresh = async () => {
		await loadDrivers(selectedId);
	};

	const handleGenerateExternalId = () => {
		form.setFieldValue("externalId", generateRandomExternalId(10));
	};

	const loadDriverForEdit = useCallback(
		async (driverId: number) => {
			setIsDriverLoading(true);
			try {
				const response = await getDriver(driverId, true);
				if (!response.driver) {
					form.resetFields();
					setPendingAliasClears([]);
					return;
				}

				form.setFieldsValue(
					toFormValues(response.driver, response.aliases),
				);
				setPendingAliasClears([]);
				setGrpcError(null);
			} catch (error) {
				const errorMessage = `Failed to load driver details: ${String(error)}`;
				setGrpcError(errorMessage);
				void message.error(errorMessage);
			} finally {
				setIsDriverLoading(false);
			}
		},
		[form],
	);

	useEffect(() => {
		if (isCreatingNew || selectedId === null) {
			return;
		}

		const timeoutId = window.setTimeout(() => {
			void loadDriverForEdit(selectedId);
		}, 0);

		return () => {
			window.clearTimeout(timeoutId);
		};
	}, [isCreatingNew, loadDriverForEdit, selectedId]);

	const handleSave = async () => {
		try {
			const wasCreatingNew = isCreatingNew;
			const clearedSimulationIds = pendingAliasClears;
			const values = await form.validateFields();
			setIsSaving(true);

			const driverInput: UpsertDriverInput = {
				name: values.name,
				externalId: values.externalId,
				isActive: values.isActive,
			};

			let savedDriverId: number | undefined;

			if (wasCreatingNew) {
				const createdDriver = await createDriver(driverInput);
				savedDriverId = createdDriver?.id;
				setIsCreatingNew(false);
			} else {
				if (selectedId === null) {
					void message.warning("Select a driver first.");
					return;
				}
				await updateDriver(selectedId, driverInput);
				savedDriverId = selectedId;
			}

			if (savedDriverId !== undefined) {
				const simulationIdsInForm = new Set(
					values.simulationAliases.map((alias) => alias.simulationId),
				);
				const clearRequests = clearedSimulationIds
					.filter(
						(simulationId) =>
							!simulationIdsInForm.has(simulationId),
					)
					.map((simulationId) =>
						setSimulationDriverAliases(
							savedDriverId!,
							simulationId,
							[],
						),
					);

				await Promise.all([
					...values.simulationAliases.map((alias) =>
						setSimulationDriverAliases(
							savedDriverId!,
							alias.simulationId,
							alias.simulationDriverId,
						),
					),
					...clearRequests,
				]);
			}

			await loadDrivers(savedDriverId ?? null);
			if (savedDriverId !== undefined) {
				await loadDriverForEdit(savedDriverId);
			}
			setPendingAliasClears([]);
			setGrpcError(null);
			void message.success(
				wasCreatingNew ? "Driver created." : "Driver updated.",
			);
		} catch (error) {
			if (
				typeof error === "object" &&
				error !== null &&
				"errorFields" in error
			) {
				return;
			}
			const errorMessage = `Failed to save driver: ${String(error)}`;
			setGrpcError(errorMessage);
			void message.error(errorMessage);
		} finally {
			setIsSaving(false);
		}
	};

	const handleDelete = async () => {
		if (selectedId === null) {
			return;
		}

		setIsDeleting(true);
		try {
			const deleted = await deleteDriver(selectedId);
			if (!deleted) {
				const errorMessage = "Driver was not deleted by backend.";
				setGrpcError(errorMessage);
				void message.warning(errorMessage);
				return;
			}

			await loadDrivers(null);
			setIsCreatingNew(false);
			setGrpcError(null);
			void message.success("Driver deleted.");
		} catch (error) {
			const errorMessage = `Failed to delete driver: ${String(error)}`;
			setGrpcError(errorMessage);
			void message.error(errorMessage);
		} finally {
			setIsDeleting(false);
		}
	};

	const handleRemoveSimulationAlias = async (
		index: number,
		remove: (index: number | number[]) => void,
	) => {
		const aliases =
			form.getFieldValue("simulationAliases") ??
			([] as SimulationAliasInput[]);
		const aliasToRemove = aliases[index] as
			| SimulationAliasInput
			| undefined;

		if (aliasToRemove?.simulationId === undefined) {
			remove(index);
			return;
		}

		if (!isCreatingNew && selectedId !== null) {
			setPendingAliasClears((current) =>
				current.includes(aliasToRemove.simulationId)
					? current
					: [...current, aliasToRemove.simulationId],
			);
		}

		remove(index);
	};

	const simulationAliases = Form.useWatch("simulationAliases", form) ?? [];

	const [nameFilter, setNameFilter] = useState("");
	const nameFilterRef = useRef<InputRef>(null);

	const filteredDrivers = useMemo(
		() =>
			nameFilter.trim() === ""
				? drivers
				: drivers.filter((d) =>
						d.name
							.toLowerCase()
							.includes(nameFilter.trim().toLowerCase()),
					),
		[drivers, nameFilter],
	);

	const simulationOptions = simulations.map((s) => ({
		value: s.id,
		label: s.name,
	}));

	return (
		<>
			<Space orientation="vertical" size={16} style={{ width: "100%" }}>
				<Title level={2} style={{ margin: 0 }}>
					Drivers
				</Title>

				<Row gutter={16}>
					<Col xs={24} md={9}>
						<Card
							title="All Drivers"
							extra={
								<Space>
									<Button
										icon={<PlusOutlined />}
										onClick={handleNewDriver}
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
							<Table<Driver>
								loading={isListLoading}
								dataSource={filteredDrivers}
								rowKey="id"
								size="small"
								pagination={{
									defaultPageSize: 20,
									showSizeChanger: true,
									pageSizeOptions: [20, 50, 100],
								}}
								onRow={(driver) => ({
									style: {
										cursor: "pointer",
										backgroundColor:
											!isCreatingNew &&
											driver.id === selectedId
												? "#e6f4ff"
												: undefined,
									},
									onClick: () =>
										handleSelectDriver(driver.id),
								})}
								columns={[
									{
										key: "name",
										dataIndex: "name",
										sorter: (a, b) =>
											a.name.localeCompare(b.name),
										defaultSortOrder: "ascend",
										title: (
											<Space
												size={4}
												onClick={(e) =>
													e.stopPropagation()
												}
											>
												<Input
													ref={nameFilterRef}
													placeholder="Filter by name"
													prefix={<SearchOutlined />}
													value={nameFilter}
													size="small"
													allowClear
													onChange={(e) =>
														setNameFilter(
															e.target.value,
														)
													}
												/>
											</Space>
										),
									},
									{
										title: "Active",
										dataIndex: "isActive",
										key: "isActive",
										sorter: (a, b) =>
											Number(b.isActive) -
											Number(a.isActive),
										render: (active: boolean) => (
											<Tag
												color={
													active ? "green" : "default"
												}
											>
												{active ? "Active" : "Inactive"}
											</Tag>
										),
									},
								]}
							/>
						</Card>
					</Col>

					<Col xs={24} md={15}>
						<Card
							title={
								isCreatingNew
									? "New Driver"
									: selectedDriver
										? `Driver #${selectedDriver.id}`
										: "Driver Details"
							}
						>
							{!isCreatingNew && !selectedDriver ? (
								<Empty description="Select a driver from the list, or click New." />
							) : (
								<Form
									form={form}
									layout="vertical"
									disabled={isDriverLoading}
									initialValues={NEW_DRIVER_DEFAULTS}
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
										<Input placeholder="Driver name" />
									</Form.Item>

									<Form.Item label="External ID" required>
										<Space.Compact
											style={{ width: "100%" }}
										>
											<Form.Item
												name="externalId"
												rules={[
													{
														required: true,
														message:
															"External ID is required",
													},
												]}
												noStyle
											>
												<Input placeholder="External ID" />
											</Form.Item>
											<Button
												onClick={
													handleGenerateExternalId
												}
											>
												Generate
											</Button>
										</Space.Compact>
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
										<Text strong>Simulation Aliases</Text>
										<Form.List name="simulationAliases">
											{(fields, { add, remove }) => (
												<Space
													orientation="vertical"
													style={{ width: "100%" }}
													size={12}
												>
													<div
														style={{
															border: "1px solid #d9d9d9",
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
																	"#fafafa",
																borderBottom:
																	fields.length >
																	0
																		? "1px solid #f0f0f0"
																		: "none",
															}}
														>
															<Col span={10}>
																<Text strong>
																	Simulation
																</Text>
															</Col>
															<Col span={11}>
																<Text strong>
																	Aliases
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
																	No
																	simulation
																	aliases
																	configured.
																</Text>
															</div>
														) : null}

														{fields.map(
															(field, index) => {
																const selectedByOthers =
																	new Set(
																		simulationAliases
																			.filter(
																				(
																					_,
																					i,
																				) =>
																					i !==
																					index,
																			)
																			.map(
																				(
																					a,
																				) =>
																					a?.simulationId,
																			)
																			.filter(
																				(
																					v,
																				): v is number =>
																					v !==
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
																					? "1px solid #f0f0f0"
																					: "none",
																		}}
																	>
																		<Col
																			span={
																				10
																			}
																		>
																			<Form.Item
																				name={[
																					field.name,
																					"simulationId",
																				]}
																				rules={[
																					{
																						required: true,
																						message:
																							"Simulation is required",
																					},
																				]}
																				style={{
																					marginBottom: 0,
																				}}
																			>
																				<Select
																					placeholder="Select simulation"
																					options={simulationOptions.map(
																						(
																							opt,
																						) => ({
																							...opt,
																							disabled:
																								selectedByOthers.has(
																									opt.value,
																								),
																						}),
																					)}
																				/>
																			</Form.Item>
																		</Col>

																		<Col
																			span={
																				11
																			}
																		>
																			<Form.Item
																				name={[
																					field.name,
																					"simulationDriverId",
																				]}
																				style={{
																					marginBottom: 0,
																				}}
																			>
																				<Select
																					mode="tags"
																					placeholder="Enter alias IDs"
																					open={
																						false
																					}
																				/>
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
																					void handleRemoveSimulationAlias(
																						field.name,
																						remove,
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
																simulationDriverId:
																	[],
															})
														}
														icon={<PlusOutlined />}
													>
														Add alias
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
												onClick={handleCancelNewDriver}
											>
												Cancel
											</Button>
										) : (
											<Popconfirm
												title="Delete driver"
												description="Are you sure you want to delete this driver?"
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
