import { createCarBrand, deleteCarBrand, updateCarBrand } from "@/api/cars";
import { DeleteOutlined, PlusOutlined, SaveOutlined } from "@ant-design/icons";
import type { CarBrand } from "@buf/srlmgr_api.bufbuild_es/backend/common/v1/common_pb";
import {
	Button,
	Card,
	Empty,
	Form,
	Input,
	List,
	Popconfirm,
	Space,
	Spin,
	message,
} from "antd";
import { useEffect, useMemo } from "react";

type BrandFormValues = {
	name: string;
};

interface BrandSectionProps {
	selectedManufacturerId: number | null;
	brands: CarBrand[];
	selectedBrandId: number | null;
	isLoading: boolean;
	isCreating: boolean;
	onSelectBrand: (id: number) => void;
	onCreateClick: () => void;
	onCreated: (manufacturerId: number, id?: number) => Promise<void>;
	onUpdated: (manufacturerId: number, id: number) => Promise<void>;
	onDeleted: (manufacturerId: number) => Promise<void>;
}

export function BrandSection({
	selectedManufacturerId,
	brands,
	selectedBrandId,
	isLoading,
	isCreating,
	onSelectBrand,
	onCreateClick,
	onCreated,
	onUpdated,
	onDeleted,
}: BrandSectionProps) {
	const [form] = Form.useForm<BrandFormValues>();

	const sortedBrands = useMemo(
		() => [...brands].sort((a, b) => a.name.localeCompare(b.name)),
		[brands],
	);

	const selectedBrand = brands.find((item) => item.id === selectedBrandId);

	useEffect(() => {
		if (isCreating) {
			form.setFieldsValue({ name: "" });
			return;
		}

		form.setFieldsValue({ name: selectedBrand?.name ?? "" });
	}, [isCreating, selectedBrand, form]);

	const handleSave = async () => {
		if (selectedManufacturerId === null) {
			void message.warning("Select a manufacturer first.");
			return;
		}

		try {
			const values = await form.validateFields();

			if (isCreating) {
				const created = await createCarBrand({
					manufacturerId: selectedManufacturerId,
					name: values.name,
				});
				void message.success("Brand created.");
				await onCreated(selectedManufacturerId, created?.id);
				return;
			}

			if (selectedBrandId === null) {
				void message.warning("Select a brand first.");
				return;
			}

			await updateCarBrand(selectedBrandId, {
				manufacturerId: selectedManufacturerId,
				name: values.name,
			});
			void message.success("Brand updated.");
			await onUpdated(selectedManufacturerId, selectedBrandId);
		} catch (error) {
			if (
				typeof error === "object" &&
				error !== null &&
				"errorFields" in error
			) {
				return;
			}
			const errorMessage = `Failed to save brand: ${String(error)}`;
			void message.error(errorMessage);
		}
	};

	const handleDelete = async () => {
		if (selectedBrandId === null || selectedManufacturerId === null) {
			return;
		}

		try {
			const deleted = await deleteCarBrand(selectedBrandId);
			if (!deleted) {
				void message.warning("Brand was not deleted by backend.");
				return;
			}
			void message.success("Brand deleted.");
			await onDeleted(selectedManufacturerId);
		} catch (error) {
			const errorMessage = `Failed to delete brand: ${String(error)}`;

			void message.error(errorMessage);
		}
	};

	return (
		<Card
			title="Brands"
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
				) : brands.length === 0 ? (
					<Empty description="No brands" />
				) : (
					<List
						size="small"
						dataSource={sortedBrands}
						renderItem={(item) => (
							<List.Item
								style={{
									cursor: "pointer",
									backgroundColor:
										selectedBrandId === item.id
											? "#e6f7ff"
											: "transparent",
									paddingInline: 8,
									borderRadius: 6,
								}}
								onClick={() => onSelectBrand(item.id)}
							>
								{item.name}
							</List.Item>
						)}
					/>
				)}
			</Spin>

			<Form form={form} layout="vertical" style={{ marginTop: 16 }}>
				<Form.Item
					label="Brand Name"
					name="name"
					rules={[
						{
							required: true,
							message: "Please enter a brand name",
						},
					]}
				>
					<Input
						placeholder="e.g., 911"
						disabled={
							selectedManufacturerId === null ||
							(!isCreating && selectedBrandId === null)
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
							(!isCreating && selectedBrandId === null)
						}
					>
						{isCreating ? "Create" : "Update"}
					</Button>
					{isCreating ? (
						<Button
							onClick={() => {
								form.resetFields();
								onSelectBrand(brands[0]?.id ?? -1);
							}}
						>
							Cancel
						</Button>
					) : (
						<Popconfirm
							title="Delete Brand"
							description="Delete selected brand and its models?"
							onConfirm={() => void handleDelete()}
							okText="Yes"
							cancelText="No"
							disabled={selectedBrandId === null}
						>
							<Button
								danger
								icon={<DeleteOutlined />}
								disabled={selectedBrandId === null}
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
