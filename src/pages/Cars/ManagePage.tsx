import {
	listCarManufacturers,
	listCarModelVariants,
	listCarModels,
} from "@/api/cars";
import { listSimulations } from "@/api/simulations";
import { ReloadOutlined } from "@ant-design/icons";
import type {
	CarManufacturer,
	CarModel,
	CarModelVariant,
	Simulation,
} from "@buf/srlmgr_api.bufbuild_es/backend/common/v1/common_pb";
import { Alert, Button, Col, Row, Space, Typography, message } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ManufacturerSection } from "./components/ManufacturerSection";
import { ModelSection } from "./components/ModelSection";
import { ModelVariantEditorSection } from "./components/ModelVariantEditorSection";
import { ModelVariantListSection } from "./components/ModelVariantListSection";

const { Title } = Typography;

export function CarManagePage() {
	const [manufacturers, setManufacturers] = useState<CarManufacturer[]>([]);
	const [models, setModels] = useState<CarModel[]>([]);
	const [variants, setVariants] = useState<CarModelVariant[]>([]);
	const [simulations, setSimulations] = useState<Simulation[]>([]);

	const [selectedManufacturerId, setSelectedManufacturerId] = useState<
		number | null
	>(null);
	const [selectedModelId, setSelectedModelId] = useState<number | null>(null);
	const [selectedVariantId, setSelectedVariantId] = useState<number | null>(
		null,
	);
	const [selectedSimulationId, setSelectedSimulationId] = useState<
		number | null
	>(null);

	const [isCreatingManufacturer, setIsCreatingManufacturer] = useState(false);
	const [isCreatingModel, setIsCreatingModel] = useState(false);
	const [isCreatingVariant, setIsCreatingVariant] = useState(false);

	const [isManufacturersLoading, setIsManufacturersLoading] = useState(false);
	const [isModelsLoading, setIsModelsLoading] = useState(false);
	const [isVariantsLoading, setIsVariantsLoading] = useState(false);

	const [grpcError, setGrpcError] = useState<string | null>(null);

	const filteredVariants = useMemo(
		() =>
			selectedModelId === null
				? []
				: variants.filter((item) => item.modelId === selectedModelId),
		[variants, selectedModelId],
	);

	const loadManufacturers = useCallback(async (nextId?: number | null) => {
		setIsManufacturersLoading(true);
		try {
			const items = await listCarManufacturers();
			setManufacturers(items);
			setGrpcError(null);

			if (nextId !== undefined) {
				setSelectedManufacturerId(
					nextId !== null && items.some((item) => item.id === nextId)
						? nextId
						: null,
				);
				return;
			}

			setSelectedManufacturerId((current) => {
				if (
					current !== null &&
					items.some((item) => item.id === current)
				) {
					return current;
				}
				return items[0]?.id ?? null;
			});
		} catch (error) {
			const errorMessage = `Failed to load manufacturers: ${String(error)}`;
			setGrpcError(errorMessage);
			void message.error(errorMessage);
		} finally {
			setIsManufacturersLoading(false);
		}
	}, []);

	const loadModels = useCallback(
		async (manufacturerId: number, nextModelId?: number | null) => {
			setIsModelsLoading(true);
			try {
				const modelItems = await listCarModels(manufacturerId);
				setModels(modelItems);
				setGrpcError(null);

				if (nextModelId !== undefined) {
					setSelectedModelId(
						nextModelId !== null &&
							modelItems.some((item) => item.id === nextModelId)
							? nextModelId
							: null,
					);
					return;
				}

				setSelectedModelId((current) => {
					if (
						current !== null &&
						modelItems.some((item) => item.id === current)
					) {
						return current;
					}
					return modelItems[0]?.id ?? null;
				});
			} catch (error) {
				const errorMessage = `Failed to load models: ${String(error)}`;
				setGrpcError(errorMessage);
				void message.error(errorMessage);
			} finally {
				setIsModelsLoading(false);
			}
		},
		[],
	);

	const loadVariants = useCallback(
		async (modelId: number, nextVariantId?: number | null) => {
			setIsVariantsLoading(true);
			try {
				const variantItems = await listCarModelVariants(modelId);
				setVariants(variantItems);
				setGrpcError(null);

				if (nextVariantId !== undefined) {
					setSelectedVariantId(
						nextVariantId !== null &&
							variantItems.some(
								(item) => item.id === nextVariantId,
							)
							? nextVariantId
							: null,
					);
					return;
				}

				setSelectedVariantId((current) => {
					if (
						current !== null &&
						variantItems.some((item) => item.id === current)
					) {
						return current;
					}
					return variantItems[0]?.id ?? null;
				});
			} catch (error) {
				const errorMessage = `Failed to load model variants: ${String(error)}`;
				setGrpcError(errorMessage);
				void message.error(errorMessage);
			} finally {
				setIsVariantsLoading(false);
			}
		},
		[],
	);

	useEffect(() => {
		const timeoutId = window.setTimeout(() => {
			void loadManufacturers();
			void listSimulations()
				.then((items) => {
					setSimulations(items);
					setSelectedSimulationId(
						(current) => current ?? items[0]?.id ?? null,
					);
				})
				.catch((error) => {
					const errorMessage = `Failed to load simulations: ${String(error)}`;
					setGrpcError(errorMessage);
					void message.error(errorMessage);
				});
		}, 0);

		return () => {
			window.clearTimeout(timeoutId);
		};
	}, [loadManufacturers]);

	useEffect(() => {
		const timeoutId = window.setTimeout(() => {
			if (selectedManufacturerId === null) {
				setModels([]);
				setVariants([]);
				setSelectedModelId(null);
				setSelectedVariantId(null);
				setIsCreatingModel(false);
				setIsCreatingVariant(false);
				return;
			}

			setSelectedModelId(null);
			setSelectedVariantId(null);
			setIsCreatingModel(false);
			setIsCreatingVariant(false);
			void loadModels(selectedManufacturerId);
		}, 0);

		return () => {
			window.clearTimeout(timeoutId);
		};
	}, [loadModels, selectedManufacturerId]);

	useEffect(() => {
		const timeoutId = window.setTimeout(() => {
			if (selectedModelId === null) {
				setVariants([]);
				setSelectedVariantId(null);
				setIsCreatingVariant(false);
				return;
			}

			setSelectedVariantId(null);
			setIsCreatingVariant(false);
			void loadVariants(selectedModelId);
		}, 0);

		return () => {
			window.clearTimeout(timeoutId);
		};
	}, [loadVariants, selectedModelId]);

	const handleRefresh = async () => {
		await loadManufacturers(selectedManufacturerId);
		if (selectedManufacturerId !== null) {
			await loadModels(selectedManufacturerId, selectedModelId);
		}
		if (selectedModelId !== null) {
			await loadVariants(selectedModelId, selectedVariantId);
		}
	};

	const handleResetHierarchy = () => {
		setSelectedModelId(null);
		setSelectedVariantId(null);
		setIsCreatingModel(false);
		setIsCreatingVariant(false);
	};

	return (
		<Space direction="vertical" size={16} style={{ width: "100%" }}>
			<Space style={{ width: "100%", justifyContent: "space-between" }}>
				<Title level={2} style={{ margin: 0 }}>
					Manage Cars
				</Title>
				<Button
					icon={<ReloadOutlined />}
					onClick={() => void handleRefresh()}
				>
					Refresh
				</Button>
			</Space>

			{grpcError && (
				<Alert
					message="Communication Error"
					description={grpcError}
					type="error"
					showIcon
				/>
			)}

			<Row gutter={16}>
				<Col xs={24} md={8}>
					<ManufacturerSection
						manufacturers={manufacturers}
						selectedManufacturerId={selectedManufacturerId}
						isLoading={isManufacturersLoading}
						isCreating={isCreatingManufacturer}
						onSelectManufacturer={(id) => {
							setIsCreatingManufacturer(false);
							setSelectedManufacturerId(id);
							handleResetHierarchy();
						}}
						onCreateClick={() => {
							setIsCreatingManufacturer(true);
							setSelectedManufacturerId(null);
							handleResetHierarchy();
						}}
						onCreated={async (id) => {
							setIsCreatingManufacturer(false);
							await loadManufacturers(id ?? null);
						}}
						onUpdated={async (id) => {
							await loadManufacturers(id);
						}}
						onDeleted={async () => {
							setIsCreatingManufacturer(false);
							await loadManufacturers(null);
						}}
					/>
				</Col>

				<Col xs={24} md={16}>
					<Space
						direction="vertical"
						size={16}
						style={{ width: "100%" }}
					>
						<Row gutter={16}>
							<Col xs={24} md={12}>
								<ModelSection
									selectedManufacturerId={
										selectedManufacturerId
									}
									models={models}
									selectedModelId={selectedModelId}
									isLoading={isModelsLoading}
									isCreating={isCreatingModel}
									onSelectModel={(id) => {
										setIsCreatingModel(false);
										setSelectedModelId(id);
										setSelectedVariantId(null);
										setIsCreatingVariant(false);
									}}
									onCreateClick={() => {
										setIsCreatingModel(true);
										setSelectedModelId(null);
										setSelectedVariantId(null);
										setIsCreatingVariant(false);
									}}
									onCreated={async (manufacturerId, id) => {
										setIsCreatingModel(false);
										await loadModels(
											manufacturerId,
											id ?? null,
										);
									}}
									onUpdated={async (manufacturerId, id) => {
										await loadModels(manufacturerId, id);
									}}
									onDeleted={async (manufacturerId) => {
										setIsCreatingModel(false);
										await loadModels(manufacturerId, null);
									}}
								/>
							</Col>

							<Col xs={24} md={12}>
								<ModelVariantListSection
									selectedModelId={selectedModelId}
									variants={filteredVariants}
									selectedVariantId={selectedVariantId}
									isLoading={isVariantsLoading}
									onSelectVariant={(id) => {
										setIsCreatingVariant(false);
										setSelectedVariantId(id);
									}}
									onCreateClick={() => {
										setIsCreatingVariant(true);
										setSelectedVariantId(null);
									}}
								/>
							</Col>
						</Row>

						<ModelVariantEditorSection
							selectedModelId={selectedModelId}
							selectedVariantId={selectedVariantId}
							simulations={simulations}
							selectedSimulationId={selectedSimulationId}
							onSelectSimulation={setSelectedSimulationId}
							isCreating={isCreatingVariant}
							variants={filteredVariants}
							onCreated={async () => {
								setIsCreatingVariant(false);
								if (selectedModelId !== null) {
									await loadVariants(selectedModelId);
								}
								setSelectedVariantId(null);
							}}
							onUpdated={async () => {
								if (selectedModelId !== null) {
									await loadVariants(
										selectedModelId,
										selectedVariantId,
									);
								}
							}}
							onDeleted={async () => {
								setSelectedVariantId(null);
								setIsCreatingVariant(false);
								if (selectedModelId !== null) {
									await loadVariants(selectedModelId, null);
								}
							}}
						/>
					</Space>
				</Col>
			</Row>
		</Space>
	);
}
