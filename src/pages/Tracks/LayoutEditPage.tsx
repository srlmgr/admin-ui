import { listSimulations } from "@/api/simulations";
import {
	createTrackLayout,
	getTrack,
	getTrackLayout,
	updateTrackLayout,
	type CreateTrackLayoutInput,
} from "@/api/tracks";
import {
	ArrowLeftOutlined,
	DeleteOutlined,
	PlusOutlined,
} from "@ant-design/icons";
import type {
	Simulation,
	TrackLayout,
} from "@buf/srlmgr_api.bufbuild_es/backend/common/v1/common_pb";
import {
	Button,
	Card,
	Form,
	Input,
	InputNumber,
	List,
	Space,
	Spin,
	Tooltip,
	message,
} from "antd";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export function TrackLayoutEditPage() {
	const navigate = useNavigate();
	const { trackId, layoutId } = useParams<{
		trackId: string;
		layoutId: string;
	}>();
	const [form] = Form.useForm();
	const [loading, setLoading] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [layout, setLayout] = useState<TrackLayout | null>(null);
	const [trackName, setTrackName] = useState<string>("");
	const [simulations, setSimulations] = useState<Simulation[]>([]);
	const [aliases, setAliases] = useState<Record<number, string[]>>({});
	const [selectedSimulationId, setSelectedSimulationId] = useState<
		number | null
	>(null);
	const isEditing = layoutId && layoutId !== "new";

	const loadData = useCallback(async () => {
		if (!trackId) return;
		try {
			setLoading(true);
			const trackIdNum = Number(trackId);
			const [trackData, simulationsData] = await Promise.all([
				getTrack(trackIdNum),
				listSimulations(),
			]);

			if (trackData) {
				setTrackName(trackData.name);
			}
			setSimulations(simulationsData);
			if (simulationsData.length > 0) {
				setSelectedSimulationId(simulationsData[0].id);
			}

			if (isEditing && layoutId && layoutId !== "new") {
				const { trackLayout, simulationAliases } = await getTrackLayout(
					Number(layoutId),
				);
				if (trackLayout) {
					setLayout(trackLayout);
					form.setFieldsValue({
						name: trackLayout.name,
						lengthMeters: trackLayout.lengthMeters,
						layoutImageUrl: trackLayout.layoutImageUrl,
					});
					const initialAliases: Record<number, string[]> = {};
					for (const aliasEntry of simulationAliases) {
						initialAliases[aliasEntry.simulationId] = [
							...aliasEntry.identifiers,
						];
					}
					for (const sim of simulationsData) {
						initialAliases[sim.id] = initialAliases[sim.id] || [];
					}
					setAliases(initialAliases);
				}
			} else {
				const initialAliases: Record<number, string[]> = {};
				for (const sim of simulationsData) {
					initialAliases[sim.id] = [];
				}
				setAliases(initialAliases);
			}
		} catch (error) {
			message.error("Failed to load data");
			console.error(error);
		} finally {
			setLoading(false);
		}
	}, [isEditing, trackId, layoutId, form]);

	useEffect(() => {
		const timeoutId = window.setTimeout(() => {
			void loadData();
		}, 0);
		return () => {
			window.clearTimeout(timeoutId);
		};
	}, [loadData]);

	const handleSubmit = async (
		values: Omit<CreateTrackLayoutInput, "trackId" | "simulationAliases">,
	) => {
		if (!trackId) {
			message.error("Track ID is required");
			return;
		}
		try {
			setSubmitting(true);
			const trackIdNum = Number(trackId);
			const simulationAliases = simulations.map((sim) => ({
				simulationId: sim.id,
				identifiers: (aliases[sim.id] || [])
					.map((alias) => alias.trim())
					.filter((alias) => alias.length > 0),
			}));

			if (isEditing && layout) {
				await updateTrackLayout({
					...values,
					trackId: trackIdNum,
					layoutId: layout.id,
					simulationAliases,
				});
				message.success("Layout updated successfully");
			} else {
				const newLayout = await createTrackLayout({
					...values,
					trackId: trackIdNum,
					simulationAliases,
				});
				if (!newLayout) {
					message.error("Failed to create layout");
					return;
				}
				message.success("Layout created successfully");
			}

			navigate(`/tracks/${trackId}/layouts`);
		} catch (error) {
			console.error(error);
			message.error(
				isEditing
					? "Failed to update layout"
					: "Failed to create layout",
			);
		} finally {
			setSubmitting(false);
		}
	};

	const handleAddAlias = (simulationId: number) => {
		setAliases({
			...aliases,
			[simulationId]: [...(aliases[simulationId] || []), ""],
		});
	};

	const handleRemoveAlias = (simulationId: number, index: number) => {
		const currentAliases = aliases[simulationId] || [];
		const newAliases = currentAliases.filter((_, i) => i !== index);
		setAliases({
			...aliases,
			[simulationId]: newAliases,
		});
	};

	const handleAliasChange = (
		simulationId: number,
		index: number,
		value: string,
	) => {
		const currentAliases = aliases[simulationId] || [];
		const newAliases = [...currentAliases];
		newAliases[index] = value;
		setAliases({
			...aliases,
			[simulationId]: newAliases,
		});
	};

	return (
		<div style={{ padding: "24px" }}>
			<Button
				type="text"
				icon={<ArrowLeftOutlined />}
				onClick={() => navigate(`/tracks/${trackId}/layouts`)}
				style={{ marginBottom: "16px" }}
			>
				Back to Layouts
			</Button>

			<Card
				title={
					isEditing
						? `Edit Layout: ${layout?.name}`
						: `Create New Layout - ${trackName}`
				}
				style={{ maxWidth: "1000px" }}
			>
				<Spin spinning={loading}>
					<Form
						form={form}
						layout="vertical"
						onFinish={handleSubmit}
						disabled={loading}
					>
						<Form.Item
							label="Layout Name"
							name="name"
							rules={[
								{
									required: true,
									message: "Please enter layout name",
								},
							]}
						>
							<Input placeholder="e.g., Grand Prix Circuit. Use '-' if track supports only one configuration" />
						</Form.Item>

						<Form.Item
							label="Length (meters)"
							name="lengthMeters"
							rules={[
								{
									required: true,
									message: "Please enter track length",
								},
							]}
						>
							<InputNumber min={0} placeholder="5793" />
						</Form.Item>

						<Form.Item
							label="Layout Image URL"
							name="layoutImageUrl"
						>
							<Input
								type="url"
								placeholder="https://example.com/layout.png"
							/>
						</Form.Item>

						{simulations.length > 0 && (
							<div
								style={{
									marginTop: "24px",
									paddingTop: "24px",
									borderTop: "1px solid #f0f0f0",
								}}
							>
								<h4
									style={{
										marginTop: 0,
										marginBottom: "16px",
									}}
								>
									Identifiers used in simulation
								</h4>
								<div
									style={{
										display: "grid",
										gridTemplateColumns: "300px 1fr",
										gap: "0",
										minHeight: "400px",
									}}
								>
									<div
										style={{
											borderRight: "1px solid #f0f0f0",
											paddingRight: "0",
										}}
									>
										<List
											itemLayout="horizontal"
											dataSource={simulations}
											renderItem={(sim) => (
												<List.Item
													style={{
														padding: "12px 16px",
														cursor: "pointer",
														backgroundColor:
															selectedSimulationId ===
															sim.id
																? "#e6f7ff"
																: "transparent",
														borderLeft:
															selectedSimulationId ===
															sim.id
																? "3px solid #1890ff"
																: "3px solid transparent",
														paddingLeft: "13px",
														margin: "0",
														transition:
															"all 0.2s ease",
													}}
													onClick={() =>
														setSelectedSimulationId(
															sim.id,
														)
													}
													onMouseEnter={(e) => {
														if (
															selectedSimulationId !==
															sim.id
														) {
															e.currentTarget.style.backgroundColor =
																"#fafafa";
														}
													}}
													onMouseLeave={(e) => {
														if (
															selectedSimulationId !==
															sim.id
														) {
															e.currentTarget.style.backgroundColor =
																"transparent";
														}
													}}
												>
													<List.Item.Meta
														title={sim.name}
														description={
															(
																aliases[
																	sim.id
																] || []
															).length > 0
																? `${(aliases[sim.id] || []).length} alias(es)`
																: "No aliases"
														}
													/>
												</List.Item>
											)}
										/>
									</div>

									<div
										style={{
											paddingLeft: "24px",
											display: "flex",
											flexDirection: "column",
										}}
									>
										{selectedSimulationId !== null ? (
											<div style={{ flex: 1 }}>
												<h4
													style={{
														marginBottom: "16px",
														marginTop: "0",
														fontSize: "16px",
														fontWeight: "500",
													}}
												>
													{simulations.find(
														(s) =>
															s.id ===
															selectedSimulationId,
													)?.name || "External Names"}
												</h4>
												<div>
													{(
														aliases[
															selectedSimulationId
														] || []
													).length === 0 ? (
														<p
															style={{
																color: "#8c8c8c",
																fontStyle:
																	"italic",
															}}
														>
															No aliases added yet
														</p>
													) : (
														<div
															style={{
																marginBottom:
																	"16px",
															}}
														>
															{(
																aliases[
																	selectedSimulationId
																] || []
															).map(
																(
																	alias,
																	index,
																) => (
																	<div
																		key={
																			index
																		}
																		style={{
																			display:
																				"flex",
																			gap: "8px",
																			marginBottom:
																				"8px",
																		}}
																	>
																		<Input
																			value={
																				alias
																			}
																			onChange={(
																				e,
																			) =>
																				handleAliasChange(
																					selectedSimulationId,
																					index,
																					e
																						.target
																						.value,
																				)
																			}
																			placeholder="Enter external name"
																			style={{
																				flex: 1,
																			}}
																		/>
																		<Tooltip title="Delete">
																			<Button
																				type="text"
																				danger
																				icon={
																					<DeleteOutlined />
																				}
																				onClick={() =>
																					handleRemoveAlias(
																						selectedSimulationId,
																						index,
																					)
																				}
																			/>
																		</Tooltip>
																	</div>
																),
															)}
														</div>
													)}
													<Button
														type="dashed"
														icon={<PlusOutlined />}
														block
														onClick={() =>
															handleAddAlias(
																selectedSimulationId,
															)
														}
													>
														Add Alias
													</Button>
												</div>
											</div>
										) : (
											<div
												style={{
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
													flex: 1,
													color: "#8c8c8c",
												}}
											>
												Select a simulation to edit
												aliases
											</div>
										)}
									</div>
								</div>
							</div>
						)}

						<Form.Item
							style={{ marginTop: "24px", marginBottom: 0 }}
						>
							<Space>
								<Button
									type="primary"
									htmlType="submit"
									loading={submitting}
								>
									{isEditing
										? "Update Layout"
										: "Create Layout"}
								</Button>
								<Button
									onClick={() =>
										navigate(`/tracks/${trackId}/layouts`)
									}
								>
									Cancel
								</Button>
							</Space>
						</Form.Item>
					</Form>
				</Spin>
			</Card>
		</div>
	);
}
