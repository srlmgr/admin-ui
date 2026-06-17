import {
	createCarManufacturer,
	deleteCarManufacturer,
	updateCarManufacturer,
} from "@/api/cars";
import { DeleteOutlined, PlusOutlined, SaveOutlined } from "@ant-design/icons";
import type { CarManufacturer } from "@buf/srlmgr_api.bufbuild_es/backend/common/v1/common_pb";
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

type ManufacturerFormValues = {
	name: string;
};

interface ManufacturerSectionProps {
	manufacturers: CarManufacturer[];
	selectedManufacturerId: number | null;
	isLoading: boolean;
	isCreating: boolean;
	onSelectManufacturer: (id: number) => void;
	onCreateClick: () => void;
	onCreated: (id?: number) => Promise<void>;
	onUpdated: (id: number) => Promise<void>;
	onDeleted: () => Promise<void>;
}

export function ManufacturerSection({
	manufacturers,
	selectedManufacturerId,
	isLoading,
	isCreating,
	onSelectManufacturer,
	onCreateClick,
	onCreated,
	onUpdated,
	onDeleted,
}: ManufacturerSectionProps) {
	const [form] = Form.useForm<ManufacturerFormValues>();
	const {
		token: { colorPrimaryBg },
	} = theme.useToken();

	const sortedManufacturers = useMemo(
		() => [...manufacturers].sort((a, b) => a.name.localeCompare(b.name)),
		[manufacturers],
	);

	const selectedManufacturer = manufacturers.find(
		(item) => item.id === selectedManufacturerId,
	);

	useEffect(() => {
		if (isCreating) {
			form.setFieldsValue({ name: "" });
			return;
		}

		form.setFieldsValue({
			name: selectedManufacturer?.name ?? "",
		});
	}, [isCreating, selectedManufacturer, form]);

	const handleSave = async () => {
		try {
			const values = await form.validateFields();

			if (isCreating) {
				const created = await createCarManufacturer(values);
				void message.success("Manufacturer created.");
				await onCreated(created?.id);
				return;
			}

			if (selectedManufacturerId === null) {
				void message.warning("Select a manufacturer first.");
				return;
			}

			await updateCarManufacturer(selectedManufacturerId, values);
			void message.success("Manufacturer updated.");
			await onUpdated(selectedManufacturerId);
		} catch (error) {
			if (
				typeof error === "object" &&
				error !== null &&
				"errorFields" in error
			) {
				return;
			}
			const errorMessage = `Failed to save manufacturer: ${String(error)}`;
			void message.error(errorMessage);
		}
	};

	const handleDelete = async () => {
		if (selectedManufacturerId === null) {
			return;
		}

		try {
			const deleted = await deleteCarManufacturer(selectedManufacturerId);
			if (!deleted) {
				void message.warning(
					"Manufacturer was not deleted by backend.",
				);
				return;
			}
			void message.success("Manufacturer deleted.");
			await onDeleted();
		} catch (error) {
			const errorMessage = `Failed to delete manufacturer: ${String(error)}`;
			void message.error(errorMessage);
		}
	};

	return (
		<Card
			title="Manufacturers"
			extra={
				<Button
					type="link"
					icon={<PlusOutlined />}
					onClick={onCreateClick}
				>
					New
				</Button>
			}
		>
			<Spin spinning={isLoading}>
				{manufacturers.length === 0 ? (
					<Empty description="No manufacturers" />
				) : (
					<List
						size="small"
						dataSource={sortedManufacturers}
						renderItem={(item) => (
							<List.Item
								style={{
									cursor: "pointer",
									backgroundColor:
										selectedManufacturerId === item.id
											? colorPrimaryBg
											: "transparent",
									paddingInline: 8,
									borderRadius: 6,
								}}
								onClick={() => onSelectManufacturer(item.id)}
							>
								{item.name}
							</List.Item>
						)}
					/>
				)}
			</Spin>

			<Form form={form} layout="vertical" style={{ marginTop: 16 }}>
				<Form.Item
					label="Manufacturer Name"
					name="name"
					rules={[
						{
							required: true,
							message: "Please enter a manufacturer name",
						},
					]}
				>
					<Input
						placeholder="e.g., Ferrari"
						disabled={
							!isCreating && selectedManufacturerId === null
						}
					/>
				</Form.Item>
				<Space>
					<Button
						type="primary"
						icon={<SaveOutlined />}
						onClick={() => void handleSave()}
						disabled={
							!isCreating && selectedManufacturerId === null
						}
					>
						{isCreating ? "Create" : "Update"}
					</Button>
					{isCreating ? (
						<Button
							onClick={() => {
								form.resetFields();
								onSelectManufacturer(
									manufacturers[0]?.id ?? -1,
								);
							}}
						>
							Cancel
						</Button>
					) : (
						<Popconfirm
							title="Delete Manufacturer"
							description="Delete selected manufacturer and its descendants?"
							onConfirm={() => void handleDelete()}
							okText="Yes"
							cancelText="No"
							disabled={selectedManufacturerId === null}
						>
							<Button
								danger
								icon={<DeleteOutlined />}
								disabled={selectedManufacturerId === null}
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
