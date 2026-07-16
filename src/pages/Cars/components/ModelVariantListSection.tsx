import { PlusOutlined } from "@ant-design/icons";
import type { CarModelVariant } from "@buf/srlmgr_api.bufbuild_es/backend/common/v1/common_pb";
import { Button, Card, Empty, List, message, Spin, theme } from "antd";
import { useMemo } from "react";

interface ModelVariantListSectionProps {
	selectedModelId: number | null;
	variants: CarModelVariant[];
	selectedVariantId: number | null;
	isLoading: boolean;
	onSelectVariant: (id: number) => void;
	onCreateClick: () => void;
}

export function ModelVariantListSection({
	selectedModelId,
	variants,
	selectedVariantId,
	isLoading,
	onSelectVariant,
	onCreateClick,
}: ModelVariantListSectionProps) {
	const {
		token: { colorPrimaryBg },
	} = theme.useToken();
	const sortedVariants = useMemo(
		() => [...variants].sort((a, b) => a.name.localeCompare(b.name)),
		[variants],
	);
	return (
		<Card
			title="Model Variants"
			extra={
				<Button
					type="link"
					icon={<PlusOutlined />}
					onClick={() => {
						if (selectedModelId === null) {
							void message.warning("Select a model first.");
							return;
						}
						onCreateClick();
					}}
					disabled={selectedModelId === null}
				>
					New
				</Button>
			}
		>
			<Spin spinning={isLoading}>
				{selectedModelId === null ? (
					<Empty description="Select a model" />
				) : variants.length === 0 ? (
					<Empty description="No variants" />
				) : (
					<List
						size="small"
						dataSource={sortedVariants}
						renderItem={(item) => (
							<List.Item
								style={{
									cursor: "pointer",
									backgroundColor:
										selectedVariantId === item.id
											? colorPrimaryBg
											: "transparent",
									paddingInline: 8,
									borderRadius: 6,
								}}
								onClick={() => onSelectVariant(item.id)}
							>
								{item.name}
							</List.Item>
						)}
					/>
				)}
			</Spin>
		</Card>
	);
}
