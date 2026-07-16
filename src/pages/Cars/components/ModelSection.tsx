import { createCarModel, deleteCarModel, updateCarModel } from "@/api/cars";
import { DeleteOutlined, PlusOutlined, SaveOutlined } from "@ant-design/icons";
import type { CarModel } from "@buf/srlmgr_api.bufbuild_es/backend/common/v1/common_pb";
import {
	Button,
	Card,
	Empty,
	Form,
	Input,
	List,
	message,
	Popconfirm,
	Space,
	Spin,
	theme,
} from "antd";
import { useEffect, useMemo } from "react";

type ModelFormValues = {
	name: string;
};

interface ModelSectionProps {
	selectedManufacturerId: number | null;
	models: CarModel[];
	selectedModelId: number | null;
	isLoading: boolean;
	isCreating: boolean;
	onSelectModel: (id: number) => void;
	onCreateClick: () => void;
	onCreated: (manufacturerId: number, id?: number) => Promise<void>;
	onUpdated: (manufacturerId: number, id: number) => Promise<void>;
	onDeleted: (manufacturerId: number) => Promise<void>;
}

export function ModelSection({
	selectedManufacturerId,
	models,
	selectedModelId,
	isLoading,
	isCreating,
	onSelectModel,
	onCreateClick,
	onCreated,
	onUpdated,
	onDeleted,
}: ModelSectionProps) {
	const [form] = Form.useForm<ModelFormValues>();
	const {
		token: { colorPrimaryBg },
	} = theme.useToken();

	const sortedModels = useMemo(
		() => [...models].sort((a, b) => a.name.localeCompare(b.name)),
		[models],
	);

	const selectedModel = models.find((item) => item.id === selectedModelId);

	useEffect(() => {
		if (isCreating) {
			form.setFieldsValue({ name: "" });
			return;
		}

		form.setFieldsValue({ name: selectedModel?.name ?? "" });
	}, [isCreating, selectedModel, form]);

	const handleSave = async () => {
		if (selectedManufacturerId === null) {
			void message.warning("Select a manufacturer first.");
			return;
		}

		try {
			const values = await form.validateFields();

			if (isCreating) {
				const created = await createCarModel({
					manufacturerId: selectedManufacturerId,
					name: values.name,
				});
				void message.success("Model created.");
				await onCreated(selectedManufacturerId, created?.id);
				return;
			}

			if (selectedModelId === null) {
				void message.warning("Select a model first.");
				return;
			}

			await updateCarModel(selectedModelId, {
				manufacturerId: selectedManufacturerId,
				name: values.name,
			});
			void message.success("Model updated.");
			await onUpdated(selectedManufacturerId, selectedModelId);
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
		if (selectedModelId === null || selectedManufacturerId === null) {
			return;
		}

		try {
			const deleted = await deleteCarModel(selectedModelId);
			if (!deleted) {
				void message.warning("Model was not deleted by backend.");
				return;
			}
			void message.success("Model deleted.");
			await onDeleted(selectedManufacturerId);
		} catch (error) {
			const errorMessage = `Failed to delete model: ${String(error)}`;

			void message.error(errorMessage);
		}
	};

	return (
		<Card
			title="Models"
			extra={
				<Button
					type="link"
					icon={<PlusOutlined />}
					onClick={() => {
						if (selectedManufacturerId === null) {
							void message.warning(
								"Select a manufacturer first.",
							);
							return;
						}
						onCreateClick();
					}}
					disabled={selectedManufacturerId === null}
				>
					New
				</Button>
			}
		>
			<Spin spinning={isLoading}>
				{selectedManufacturerId === null ? (
					<Empty description="Select a manufacturer" />
				) : models.length === 0 ? (
					<Empty description="No models" />
				) : (
					<List
						size="small"
						dataSource={sortedModels}
						renderItem={(item) => (
							<List.Item
								style={{
									cursor: "pointer",
									backgroundColor:
										selectedModelId === item.id
											? colorPrimaryBg
											: "transparent",
									paddingInline: 8,
									borderRadius: 6,
								}}
								onClick={() => onSelectModel(item.id)}
							>
								{item.name}
							</List.Item>
						)}
					/>
				)}
			</Spin>

			<Form form={form} layout="vertical" style={{ marginTop: 16 }}>
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
					<Input
						placeholder="e.g., 296"
						disabled={
							selectedManufacturerId === null ||
							(!isCreating && selectedModelId === null)
						}
					/>
				</Form.Item>
				<Space>
					<Button
						type="primary"
						icon={<SaveOutlined />}
						onClick={() => void handleSave()}
						disabled={
							selectedManufacturerId === null ||
							(!isCreating && selectedModelId === null)
						}
					>
						{isCreating ? "Create" : "Update"}
					</Button>
					{isCreating ? (
						<Button
							onClick={() => {
								form.resetFields();
								onSelectModel(models[0]?.id ?? -1);
							}}
						>
							Cancel
						</Button>
					) : (
						<Popconfirm
							title="Delete Model"
							description="Delete selected model and its variants?"
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
		</Card>
	);
}
