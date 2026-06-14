import {
	assignCarModelToCarClass,
	createCarClass,
	deleteCarClass,
	getCarClass,
	listCarClassModels,
	listCarClasses,
	unassignCarModelFromCarClass,
	updateCarClass,
	type UpsertCarClassInput,
} from "@/api/carClasses";
import { listAllCarModelOptions } from "@/api/cars";
import {
	DeleteOutlined,
	EditOutlined,
	PlusOutlined,
	SearchOutlined,
} from "@ant-design/icons";
import type {
	CarClass,
	CarModel,
} from "@buf/srlmgr_api.bufbuild_es/backend/common/v1/common_pb";
import {
	Alert,
	Button,
	Card,
	Col,
	Form,
	Input,
	Modal,
	Popconfirm,
	Row,
	Select,
	Space,
	Table,
	Typography,
	message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useEffect, useMemo, useState } from "react";

const { Text } = Typography;

type CarClassFormValues = {
	name: string;
};

type CarModelOption = {
	carModelId: number;
	label: string;
};

export function CarClassManagePage() {
	const [classes, setClasses] = useState<CarClass[]>([]);
	const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
	const [selectedClass, setSelectedClass] = useState<CarClass | null>(null);
	const [classModels, setClassModels] = useState<CarModel[]>([]);
	const [allModelOptions, setAllModelOptions] = useState<CarModelOption[]>(
		[],
	);
	const [selectedModelToAssign, setSelectedModelToAssign] = useState<
		number | undefined
	>(undefined);
	const [nameFilter, setNameFilter] = useState("");
	const [grpcError, setGrpcError] = useState<string | null>(null);

	const [isClassesLoading, setIsClassesLoading] = useState(false);
	const [isDetailLoading, setIsDetailLoading] = useState(false);
	const [isModelOpLoading, setIsModelOpLoading] = useState(false);
	const [isSavingClass, setIsSavingClass] = useState(false);

	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingClass, setEditingClass] = useState<CarClass | null>(null);
	const [form] = Form.useForm<CarClassFormValues>();

	const sortedAndFilteredClasses = useMemo(() => {
		const query = nameFilter.trim().toLowerCase();
		const filtered =
			query === ""
				? classes
				: classes.filter((item) =>
						item.name.toLowerCase().includes(query),
					);
		return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
	}, [classes, nameFilter]);

	const assignedModelIds = useMemo(
		() => new Set(classModels.map((model) => model.id)),
		[classModels],
	);

	const availableModelOptions = useMemo(
		() =>
			allModelOptions
				.filter((option) => !assignedModelIds.has(option.carModelId))
				.sort((a, b) => a.label.localeCompare(b.label)),
		[allModelOptions, assignedModelIds],
	);

	const assignedModelRows = useMemo(
		() =>
			[...classModels].sort((a, b) => {
				const aLabel =
					allModelOptions.find((option) => option.carModelId === a.id)
						?.label ?? a.name;
				const bLabel =
					allModelOptions.find((option) => option.carModelId === b.id)
						?.label ?? b.name;
				return aLabel.localeCompare(bLabel);
			}),
		[classModels, allModelOptions],
	);

	const loadClasses = useCallback(async (nextSelectedId?: number | null) => {
		setIsClassesLoading(true);
		try {
			const items = await listCarClasses();
			setClasses(items);
			setGrpcError(null);

			if (nextSelectedId !== undefined) {
				setSelectedClassId(
					nextSelectedId !== null &&
						items.some((item) => item.id === nextSelectedId)
						? nextSelectedId
						: null,
				);
				return;
			}

			setSelectedClassId((current) => {
				if (
					current !== null &&
					items.some((item) => item.id === current)
				) {
					return current;
				}
				return items[0]?.id ?? null;
			});
		} catch (error) {
			const errorMessage = `Failed to load car classes: ${String(error)}`;
			setGrpcError(errorMessage);
			void message.error(errorMessage);
		} finally {
			setIsClassesLoading(false);
		}
	}, []);

	const loadDetails = useCallback(async (carClassId: number) => {
		setIsDetailLoading(true);
		try {
			const [carClass, models] = await Promise.all([
				getCarClass(carClassId),
				listCarClassModels(carClassId),
			]);
			setSelectedClass(carClass ?? null);
			setClassModels(models);
			setGrpcError(null);
		} catch (error) {
			const errorMessage = `Failed to load car class details: ${String(error)}`;
			setGrpcError(errorMessage);
			void message.error(errorMessage);
		} finally {
			setIsDetailLoading(false);
		}
	}, []);

	const loadAllModelOptions = useCallback(async () => {
		try {
			const items = await listAllCarModelOptions();
			setAllModelOptions(items);
		} catch (error) {
			const errorMessage = `Failed to load car models: ${String(error)}`;
			setGrpcError(errorMessage);
			void message.error(errorMessage);
		}
	}, []);

	useEffect(() => {
		const timeoutId = window.setTimeout(() => {
			void Promise.all([loadClasses(), loadAllModelOptions()]);
		}, 0);

		return () => {
			window.clearTimeout(timeoutId);
		};
	}, [loadClasses, loadAllModelOptions]);

	useEffect(() => {
		const timeoutId = window.setTimeout(() => {
			if (selectedClassId === null) {
				setSelectedClass(null);
				setClassModels([]);
				setSelectedModelToAssign(undefined);
				return;
			}

			setSelectedModelToAssign(undefined);
			void loadDetails(selectedClassId);
		}, 0);

		return () => {
			window.clearTimeout(timeoutId);
		};
	}, [selectedClassId, loadDetails]);

	const openCreateModal = () => {
		setEditingClass(null);
		form.setFieldsValue({ name: "" });
		setIsModalOpen(true);
	};

	const openEditModal = () => {
		if (!selectedClass) {
			return;
		}
		setEditingClass(selectedClass);
		form.setFieldsValue({ name: selectedClass.name });
		setIsModalOpen(true);
	};

	const handleModalCancel = () => {
		setIsModalOpen(false);
		setEditingClass(null);
		form.resetFields();
	};

	const handleSaveClass = async () => {
		try {
			const values = await form.validateFields();
			const payload: UpsertCarClassInput = {
				name: values.name.trim(),
			};

			setIsSavingClass(true);
			if (editingClass) {
				const updated = await updateCarClass(editingClass.id, payload);
				void message.success("Car class updated");
				await loadClasses(updated?.id ?? editingClass.id);
			} else {
				const created = await createCarClass(payload);
				void message.success("Car class created");
				await loadClasses(created?.id ?? null);
			}
			setIsModalOpen(false);
			setEditingClass(null);
			form.resetFields();
		} catch (error) {
			if ((error as { errorFields?: unknown[] }).errorFields) {
				return;
			}
			const errorMessage = `Failed to save car class: ${String(error)}`;
			setGrpcError(errorMessage);
			void message.error(errorMessage);
		} finally {
			setIsSavingClass(false);
		}
	};

	const handleDeleteClass = async (carClass: CarClass) => {
		try {
			await deleteCarClass(carClass.id);
			void message.success("Car class deleted");
			await loadClasses(null);
		} catch (error) {
			const errorMessage = `Failed to delete car class: ${String(error)}`;
			setGrpcError(errorMessage);
			void message.error(errorMessage);
		}
	};

	const handleAssignModel = async () => {
		if (selectedClassId === null || selectedModelToAssign === undefined) {
			return;
		}
		setIsModelOpLoading(true);
		try {
			await assignCarModelToCarClass(
				selectedClassId,
				selectedModelToAssign,
			);
			void message.success("Car model assigned");
			setSelectedModelToAssign(undefined);
			await loadDetails(selectedClassId);
		} catch (error) {
			const errorMessage = `Failed to assign car model: ${String(error)}`;
			setGrpcError(errorMessage);
			void message.error(errorMessage);
		} finally {
			setIsModelOpLoading(false);
		}
	};

	const handleUnassignModel = async (carModelId: number) => {
		if (selectedClassId === null) {
			return;
		}
		setIsModelOpLoading(true);
		try {
			await unassignCarModelFromCarClass(selectedClassId, carModelId);
			void message.success("Car model removed from class");
			await loadDetails(selectedClassId);
		} catch (error) {
			const errorMessage = `Failed to remove car model: ${String(error)}`;
			setGrpcError(errorMessage);
			void message.error(errorMessage);
		} finally {
			setIsModelOpLoading(false);
		}
	};

	const classColumns: ColumnsType<CarClass> = [
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
	];

	const modelColumns: ColumnsType<CarModel> = [
		{
			title: "Model",
			key: "name",
			render: (_, model) =>
				allModelOptions.find((option) => option.carModelId === model.id)
					?.label ?? model.name,
		},
		{
			title: "Actions",
			key: "actions",
			render: (_, model) => (
				<Popconfirm
					title="Remove model"
					description={`Remove ${model.name} from this car class?`}
					onConfirm={() => void handleUnassignModel(model.id)}
					okText="Remove"
					okButtonProps={{ danger: true }}
				>
					<Button
						type="text"
						danger
						size="small"
						icon={<DeleteOutlined />}
					>
						Remove
					</Button>
				</Popconfirm>
			),
		},
	];

	return (
		<Space orientation="vertical" size={16} style={{ width: "100%" }}>
			<Space style={{ width: "100%", justifyContent: "space-between" }}>
				<Typography.Title level={2} style={{ margin: 0 }}>
					Manage Car Classes
				</Typography.Title>
				<Button
					type="primary"
					icon={<PlusOutlined />}
					onClick={openCreateModal}
				>
					Create Car Class
				</Button>
			</Space>

			{grpcError && (
				<Alert
					title="Communication Error"
					description={grpcError}
					type="error"
					showIcon
				/>
			)}

			<Row gutter={16}>
				<Col xs={24} lg={9}>
					<Card title="Car Classes" size="small">
						<Table<CarClass>
							rowKey="id"
							size="small"
							loading={isClassesLoading}
							columns={classColumns}
							dataSource={sortedAndFilteredClasses}
							pagination={{
								defaultPageSize: 10,
								size: "small",
								showSizeChanger: true,
							}}
							onRow={(record) => ({
								onClick: () => setSelectedClassId(record.id),
							})}
							rowSelection={{
								type: "radio",
								selectedRowKeys:
									selectedClassId !== null
										? [selectedClassId]
										: [],
								onChange: (selectedRowKeys) => {
									setSelectedClassId(
										(selectedRowKeys[0] as
											| number
											| undefined) ?? null,
									);
								},
							}}
						/>
					</Card>
				</Col>

				<Col xs={24} lg={15}>
					<Card
						title={
							selectedClass
								? `Details: ${selectedClass.name}`
								: "Details"
						}
						size="small"
						extra={
							selectedClass && (
								<Space>
									<Button
										size="small"
										icon={<EditOutlined />}
										onClick={openEditModal}
									>
										Edit
									</Button>
									<Popconfirm
										title="Delete car class"
										description={`Delete ${selectedClass.name}?`}
										onConfirm={() =>
											void handleDeleteClass(
												selectedClass,
											)
										}
										okText="Delete"
										okButtonProps={{ danger: true }}
									>
										<Button
											size="small"
											danger
											icon={<DeleteOutlined />}
										>
											Delete
										</Button>
									</Popconfirm>
								</Space>
							)
						}
					>
						{selectedClassId === null ? (
							<Text type="secondary">
								Select a car class from the list or create a new
								one.
							</Text>
						) : (
							<Space
								direction="vertical"
								size={16}
								style={{ width: "100%" }}
							>
								<Space
									style={{ width: "100%" }}
									direction="vertical"
									size={8}
								>
									<Text strong>Assigned Car Models</Text>
									<Space.Compact style={{ width: "100%" }}>
										<Select
											style={{ width: "100%" }}
											placeholder="Select car model"
											value={selectedModelToAssign}
											onChange={(value) =>
												setSelectedModelToAssign(value)
											}
											options={availableModelOptions.map(
												(option) => ({
													value: option.carModelId,
													label: option.label,
												}),
											)}
											showSearch
											optionFilterProp="label"
										/>
										<Button
											type="primary"
											disabled={
												selectedModelToAssign ===
												undefined
											}
											loading={isModelOpLoading}
											onClick={() =>
												void handleAssignModel()
											}
										>
											Add
										</Button>
									</Space.Compact>
								</Space>

								<Table<CarModel>
									rowKey="id"
									size="small"
									loading={
										isDetailLoading || isModelOpLoading
									}
									columns={modelColumns}
									dataSource={assignedModelRows}
									locale={{ emptyText: "No models assigned" }}
									pagination={{
										defaultPageSize: 10,
										size: "small",
										showSizeChanger: true,
									}}
								/>
							</Space>
						)}
					</Card>
				</Col>
			</Row>

			<Modal
				title={editingClass ? "Edit Car Class" : "Create Car Class"}
				open={isModalOpen}
				onOk={() => void handleSaveClass()}
				onCancel={handleModalCancel}
				confirmLoading={isSavingClass}
				destroyOnHidden
			>
				<Form<CarClassFormValues> form={form} layout="vertical">
					<Form.Item<CarClassFormValues>
						name="name"
						label="Name"
						rules={[
							{
								required: true,
								message: "Please provide a name.",
							},
							{
								validator: (_, value: string) => {
									if (!value || value.trim().length > 0) {
										return Promise.resolve();
									}
									return Promise.reject(
										new Error("Name cannot be empty."),
									);
								},
							},
						]}
					>
						<Input
							autoFocus
							placeholder="e.g. GT3"
							maxLength={128}
						/>
					</Form.Item>
				</Form>
			</Modal>
		</Space>
	);
}
