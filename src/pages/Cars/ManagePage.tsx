import { listCarBrands, listCarManufacturers, listCarModels } from "@/api/cars";
import { listSimulations } from "@/api/simulations";
import { ReloadOutlined } from "@ant-design/icons";
import type {
	CarBrand,
	CarManufacturer,
	CarModel,
	Simulation,
} from "@buf/srlmgr_api.bufbuild_es/backend/common/v1/common_pb";
import { Alert, Button, Col, Row, Space, Typography, message } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BrandSection } from "./components/BrandSection";
import { ManufacturerSection } from "./components/ManufacturerSection";
import { ModelEditorSection } from "./components/ModelEditorSection";
import { ModelListSection } from "./components/ModelListSection";

const { Title } = Typography;

export function CarManagePage() {
	const [manufacturers, setManufacturers] = useState<CarManufacturer[]>([]);
	const [brands, setBrands] = useState<CarBrand[]>([]);
	const [models, setModels] = useState<CarModel[]>([]);
	const [simulations, setSimulations] = useState<Simulation[]>([]);

	const [selectedManufacturerId, setSelectedManufacturerId] = useState<
		number | null
	>(null);
	const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
	const [selectedModelId, setSelectedModelId] = useState<number | null>(null);
	const [selectedSimulationId, setSelectedSimulationId] = useState<
		number | null
	>(null);

	const [isCreatingManufacturer, setIsCreatingManufacturer] = useState(false);
	const [isCreatingBrand, setIsCreatingBrand] = useState(false);
	const [isCreatingModel, setIsCreatingModel] = useState(false);

	const [isManufacturersLoading, setIsManufacturersLoading] = useState(false);
	const [isBrandsLoading, setIsBrandsLoading] = useState(false);
	const [isModelsLoading, setIsModelsLoading] = useState(false);

	const [grpcError, setGrpcError] = useState<string | null>(null);

	const filteredModels = useMemo(
		() =>
			selectedBrandId === null
				? []
				: models.filter((item) => item.brandId === selectedBrandId),
		[models, selectedBrandId],
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

	const loadBrandsAndModels = useCallback(
		async (manufacturerId: number, nextBrandId?: number | null) => {
			setIsBrandsLoading(true);
			setIsModelsLoading(true);
			try {
				const [brandItems, modelItems] = await Promise.all([
					listCarBrands(manufacturerId),
					listCarModels(manufacturerId),
				]);
				setBrands(brandItems);
				setModels(modelItems);
				setGrpcError(null);

				if (nextBrandId !== undefined) {
					setSelectedBrandId(
						nextBrandId !== null &&
							brandItems.some((item) => item.id === nextBrandId)
							? nextBrandId
							: null,
					);
					return;
				}

				setSelectedBrandId((current) => {
					if (
						current !== null &&
						brandItems.some((item) => item.id === current)
					) {
						return current;
					}
					return brandItems[0]?.id ?? null;
				});
			} catch (error) {
				const errorMessage = `Failed to load brands/models: ${String(error)}`;
				setGrpcError(errorMessage);
				void message.error(errorMessage);
			} finally {
				setIsBrandsLoading(false);
				setIsModelsLoading(false);
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
				setBrands([]);
				setModels([]);
				setSelectedBrandId(null);
				setSelectedModelId(null);
				setIsCreatingBrand(false);
				setIsCreatingModel(false);
				return;
			}

			setSelectedModelId(null);
			setIsCreatingBrand(false);
			setIsCreatingModel(false);
			void loadBrandsAndModels(selectedManufacturerId);
		}, 0);

		return () => {
			window.clearTimeout(timeoutId);
		};
	}, [loadBrandsAndModels, selectedManufacturerId]);

	const handleRefresh = async () => {
		await loadManufacturers(selectedManufacturerId);
		if (selectedManufacturerId !== null) {
			await loadBrandsAndModels(selectedManufacturerId, selectedBrandId);
		}
	};

	const handleResetModel = () => {
		setSelectedModelId(null);
		setIsCreatingModel(false);
	};

	const handleResetBrand = () => {
		setSelectedModelId(null);
		setIsCreatingModel(false);
		setSelectedBrandId(null);
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
							handleResetBrand();
						}}
						onCreateClick={() => {
							setIsCreatingManufacturer(true);
							setSelectedManufacturerId(null);
							handleResetBrand();
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
								<BrandSection
									selectedManufacturerId={
										selectedManufacturerId
									}
									brands={brands}
									selectedBrandId={selectedBrandId}
									isLoading={isBrandsLoading}
									isCreating={isCreatingBrand}
									onSelectBrand={(id) => {
										setIsCreatingBrand(false);
										setSelectedBrandId(id);
										handleResetModel();
									}}
									onCreateClick={() => {
										setIsCreatingBrand(true);
										setSelectedBrandId(null);
										handleResetModel();
									}}
									onCreated={async (manufacturerId, id) => {
										setIsCreatingBrand(false);
										await loadBrandsAndModels(
											manufacturerId,
											id ?? null,
										);
									}}
									onUpdated={async (manufacturerId, id) => {
										await loadBrandsAndModels(
											manufacturerId,
											id,
										);
									}}
									onDeleted={async (manufacturerId) => {
										setIsCreatingBrand(false);
										await loadBrandsAndModels(
											manufacturerId,
											null,
										);
									}}
								/>
							</Col>

							<Col xs={24} md={12}>
								<ModelListSection
									selectedBrandId={selectedBrandId}
									models={filteredModels}
									selectedModelId={selectedModelId}
									isLoading={isModelsLoading}
									onSelectModel={(id) => {
										setIsCreatingModel(false);
										setSelectedModelId(id);
									}}
									onCreateClick={() => {
										setIsCreatingModel(true);
										setSelectedModelId(null);
									}}
								/>
							</Col>
						</Row>

						<ModelEditorSection
							selectedBrandId={selectedBrandId}
							selectedModelId={selectedModelId}
							simulations={simulations}
							selectedSimulationId={selectedSimulationId}
							onSelectSimulation={setSelectedSimulationId}
							isCreating={isCreatingModel}
							filteredModels={filteredModels}
							selectedManufacturerId={selectedManufacturerId}
							onCreated={async () => {
								setIsCreatingModel(false);
								if (selectedManufacturerId !== null) {
									await loadBrandsAndModels(
										selectedManufacturerId,
										selectedBrandId,
									);
								}
								handleResetModel();
							}}
							onUpdated={async () => {
								if (selectedManufacturerId !== null) {
									await loadBrandsAndModels(
										selectedManufacturerId,
										selectedBrandId,
									);
								}
							}}
							onDeleted={async () => {
								setSelectedModelId(null);
								setIsCreatingModel(false);
								if (selectedManufacturerId !== null) {
									await loadBrandsAndModels(
										selectedManufacturerId,
										selectedBrandId,
									);
								}
							}}
						/>
					</Space>
				</Col>
			</Row>
		</Space>
	);
}
