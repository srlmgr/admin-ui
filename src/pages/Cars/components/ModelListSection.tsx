import { PlusOutlined } from "@ant-design/icons";
import type { CarModel } from "@buf/srlmgr_api.bufbuild_es/backend/common/v1/common_pb";
import { Button, Card, Empty, List, message, Spin, theme } from "antd";
import { useMemo } from "react";

interface ModelListSectionProps {
	selectedBrandId: number | null;
	models: CarModel[];
	selectedModelId: number | null;
	isLoading: boolean;
	onSelectModel: (id: number) => void;
	onCreateClick: () => void;
}

export function ModelListSection({
	selectedBrandId,
	models,
	selectedModelId,
	isLoading,
	onSelectModel,
	onCreateClick,
}: ModelListSectionProps) {
	const {
		token: { colorPrimaryBg },
	} = theme.useToken();
	const sortedModels = useMemo(
		() => [...models].sort((a, b) => a.name.localeCompare(b.name)),
		[models],
	);
	return (
		<Card
			title="Models"
			extra={
				<Button
					type="link"
					icon={<PlusOutlined />}
					onClick={() => {
						if (selectedBrandId === null) {
							void message.warning("Select a brand first.");
							return;
						}
						onCreateClick();
					}}
					disabled={selectedBrandId === null}
				>
					New
				</Button>
			}
		>
			<Spin spinning={isLoading}>
				{selectedBrandId === null ? (
					<Empty description="Select a brand" />
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
		</Card>
	);
}
