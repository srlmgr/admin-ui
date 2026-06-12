import { getCommandClient, getQueryClient } from "@/api/grpcClients";
import {
	ArrowLeftOutlined,
	DeleteOutlined,
	PlusOutlined,
	SaveOutlined,
} from "@ant-design/icons";
import {
	PointPolicy,
	type PointRaceSettings,
} from "@buf/srlmgr_api.bufbuild_es/backend/common/v1/common_pb";
import {
	Alert,
	Button,
	Card,
	Divider,
	Form,
	Input,
	InputNumber,
	Popconfirm,
	Select,
	Space,
	Switch,
	Typography,
	message,
} from "antd";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const { Title, Text } = Typography;

type PointSystemFormValues = {
	name: string;
	description: string;
	minRaceDistancePercent: number;
	guests: boolean;
};

const DEFAULT_FORM_VALUES: PointSystemFormValues = {
	name: "",
	description: "",
	minRaceDistancePercent: 75,
	guests: true,
};

type PolicyType =
	| "finishPos"
	| "qualificationPos"
	| "leastIncidents"
	| "fastestLap"
	| "topNFinisher"
	| "incidentsExceeded";

type DraftTable = {
	id: string;
	values: string;
};

type DraftThresholdRule = {
	id: string;
	threshold: number;
	penaltyPercent: number;
};

type DraftPolicy = {
	id: string;
	type: PolicyType;
	tables: DraftTable[];
	rules: DraftThresholdRule[];
};

type DraftRaceSetting = {
	id: string;
	name: string;
	policies: DraftPolicy[];
};

function createId(): string {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
		return crypto.randomUUID();
	}

	return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function emptyTable(): DraftTable {
	return {
		id: createId(),
		values: "",
	};
}

function emptyThresholdRule(): DraftThresholdRule {
	return {
		id: createId(),
		threshold: 0,
		penaltyPercent: 0,
	};
}

function createPolicy(type: PolicyType = "finishPos"): DraftPolicy {
	return {
		id: createId(),
		type,
		tables: type === "incidentsExceeded" ? [] : [emptyTable()],
		rules: type === "incidentsExceeded" ? [emptyThresholdRule()] : [],
	};
}

function createRaceSetting(): DraftRaceSetting {
	return {
		id: createId(),
		name: "",
		policies: [createPolicy("finishPos")],
	};
}

function tableValuesToText(values: number[]): string {
	return values.join(", ");
}

function parsePointTable(valuesText: string): number[] {
	return valuesText
		.split(",")
		.map((entry) => entry.trim())
		.filter((entry) => entry.length > 0)
		.map((entry) => Number.parseInt(entry, 10))
		.filter((value) => Number.isInteger(value));
}

function policyTypeFromConfig(
	policy: PointRaceSettings["policies"][number],
): PolicyType {
	switch (policy.config.case) {
		case "finishPos":
			return "finishPos";
		case "qualificationPos":
			return "qualificationPos";
		case "leastIncidents":
			return "leastIncidents";
		case "fastestLap":
			return "fastestLap";
		case "topNFinisher":
			return "topNFinisher";
		case "incidentsExceeded":
			return "incidentsExceeded";
		default:
			switch (policy.name) {
				case PointPolicy.FINISH_POS:
					return "finishPos";
				case PointPolicy.QUALIFICATION_POS:
					return "qualificationPos";
				case PointPolicy.LEAST_INCIDENTS:
					return "leastIncidents";
				case PointPolicy.FASTEST_LAP:
					return "fastestLap";
				case PointPolicy.TOP_N_FINISHER:
					return "topNFinisher";
				case PointPolicy.INCIDENTS_EXCEEDED:
					return "incidentsExceeded";
				default:
					return "finishPos";
			}
	}
}

function raceSettingsToDraft(source: PointRaceSettings[]): DraftRaceSetting[] {
	if (source.length === 0) {
		return [createRaceSetting()];
	}

	return source.map((setting) => ({
		id: createId(),
		name: setting.name,
		policies:
			setting.policies.length === 0
				? [createPolicy("finishPos")]
				: setting.policies.map((policy) => {
						const type = policyTypeFromConfig(policy);
						if (type === "incidentsExceeded") {
							const rules =
								policy.config.case === "incidentsExceeded"
									? policy.config.value.rules
									: [];

							return {
								id: createId(),
								type,
								tables: [],
								rules:
									rules.length === 0
										? [emptyThresholdRule()]
										: rules.map((rule) => ({
												id: createId(),
												threshold: rule.threshold,
												penaltyPercent:
													rule.penaltyPercent * 100,
											})),
							};
						}

						const tables =
							policy.config.case === type
								? policy.config.value.tables
								: [];

						return {
							id: createId(),
							type,
							tables:
								tables.length === 0
									? [emptyTable()]
									: tables.map((table) => ({
											id: createId(),
											values: tableValuesToText(
												table.values,
											),
										})),
							rules: [],
						};
					}),
	}));
}

function policyTypeToEnum(type: PolicyType): PointPolicy {
	switch (type) {
		case "finishPos":
			return PointPolicy.FINISH_POS;
		case "qualificationPos":
			return PointPolicy.QUALIFICATION_POS;
		case "leastIncidents":
			return PointPolicy.LEAST_INCIDENTS;
		case "fastestLap":
			return PointPolicy.FASTEST_LAP;
		case "topNFinisher":
			return PointPolicy.TOP_N_FINISHER;
		case "incidentsExceeded":
			return PointPolicy.INCIDENTS_EXCEEDED;
	}
}

function toPointRaceSettings(draft: DraftRaceSetting[]): PointRaceSettings[] {
	return draft
		.map((setting) => ({
			name: setting.name.trim(),
			policies: setting.policies.map((policy) => {
				if (policy.type === "incidentsExceeded") {
					return {
						name: policyTypeToEnum(policy.type),
						config: {
							case: "incidentsExceeded" as const,
							value: {
								rules: policy.rules.map((rule) => ({
									threshold: rule.threshold,
									penaltyPercent: rule.penaltyPercent / 100,
								})),
							},
						},
					};
				}

				return {
					name: policyTypeToEnum(policy.type),
					config: {
						case: policy.type,
						value: {
							tables: policy.tables.map((table) => ({
								values: parsePointTable(table.values),
							})),
						},
					},
				};
			}),
		}))
		.filter((setting) => setting.name.length > 0) as PointRaceSettings[];
}

const policyOptions: Array<{ value: PolicyType; label: string }> = [
	{ value: "finishPos", label: "Finish Position" },
	{ value: "qualificationPos", label: "Qualification Position" },
	{ value: "leastIncidents", label: "Least Incidents" },
	{ value: "fastestLap", label: "Fastest Lap" },
	{ value: "topNFinisher", label: "Top N Finisher" },
	{ value: "incidentsExceeded", label: "Incidents Exceeded" },
];

const policyInputWidths: Record<
	Exclude<PolicyType, "incidentsExceeded">,
	number
> = {
	finishPos: 800,
	qualificationPos: 240,
	leastIncidents: 240,
	fastestLap: 240,
	topNFinisher: 240,
};

function getPolicyInputWidth(type: PolicyType): number | undefined {
	if (type === "incidentsExceeded") {
		return undefined;
	}

	return policyInputWidths[type];
}

export function PointSystemEditPage() {
	const [form] = Form.useForm<PointSystemFormValues>();
	const navigate = useNavigate();
	const params = useParams();

	const pointSystemId = Number(params.pointSystemId);
	const isEditing = Number.isFinite(pointSystemId) && pointSystemId > 0;

	const [isLoading, setIsLoading] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [grpcError, setGrpcError] = useState<string | null>(null);
	const [raceSettings, setRaceSettings] = useState<DraftRaceSetting[]>([
		createRaceSetting(),
	]);

	const loadData = useCallback(async () => {
		setIsLoading(true);
		try {
			if (!isEditing) {
				form.setFieldsValue(DEFAULT_FORM_VALUES);
				setRaceSettings([createRaceSetting()]);
				setGrpcError(null);
				return;
			}

			const response = await getQueryClient().getPointSystem({
				id: pointSystemId,
			});
			const pointSystem = response.pointSystem;
			if (!pointSystem) {
				setGrpcError("Point system not found.");
				return;
			}

			form.setFieldsValue({
				name: pointSystem.name,
				description: pointSystem.description,
				minRaceDistancePercent:
					(pointSystem.eligibility?.minRaceDistancePercent ?? 0) *
					100,
				guests: pointSystem.eligibility?.guests ?? true,
			});
			setRaceSettings(raceSettingsToDraft(pointSystem.raceSettings));
			setGrpcError(null);
		} catch (error) {
			const errorMessage = `Failed to load point system data: ${String(error)}`;
			setGrpcError(errorMessage);
			void message.error(errorMessage);
		} finally {
			setIsLoading(false);
		}
	}, [form, isEditing, pointSystemId]);

	useEffect(() => {
		const timeoutId = window.setTimeout(() => {
			void loadData();
		}, 0);

		return () => {
			window.clearTimeout(timeoutId);
		};
	}, [loadData]);

	const handleSave = async () => {
		try {
			const values = await form.validateFields();
			const payloadRaceSettings = toPointRaceSettings(raceSettings);
			if (payloadRaceSettings.length === 0) {
				throw new Error(
					"Add at least one race setting and provide a name.",
				);
			}
			setIsSaving(true);

			const eligibility = {
				minRaceDistancePercent: values.minRaceDistancePercent / 100,
				guests: values.guests,
			};

			if (isEditing) {
				await getCommandClient().updatePointSystem({
					pointSystemId,
					name: values.name,
					description: values.description,
					eligibility: eligibility,
					raceSettings: payloadRaceSettings,
				});
				void message.success("Point system updated.");
			} else {
				await getCommandClient().createPointSystem({
					name: values.name,
					description: values.description,
					eligibility: eligibility,
					raceSettings: payloadRaceSettings,
				});
				void message.success("Point system created.");
				navigate("/point-systems/manage");
			}
			setGrpcError(null);
		} catch (error) {
			if (
				typeof error === "object" &&
				error !== null &&
				"errorFields" in error
			) {
				return;
			}
			const errorMessage = `Failed to save point system: ${String(error)}`;
			setGrpcError(errorMessage);
			void message.error(errorMessage);
		} finally {
			setIsSaving(false);
		}
	};

	const addRaceSetting = () => {
		setRaceSettings((current) => [...current, createRaceSetting()]);
	};

	const updateRaceSettingName = (id: string, name: string) => {
		setRaceSettings((current) =>
			current.map((setting) =>
				setting.id === id ? { ...setting, name } : setting,
			),
		);
	};

	const removeRaceSetting = (id: string) => {
		setRaceSettings((current) =>
			current.filter((setting) => setting.id !== id),
		);
	};

	const addPolicy = (settingId: string) => {
		setRaceSettings((current) =>
			current.map((setting) =>
				setting.id === settingId
					? {
							...setting,
							policies: [
								...setting.policies,
								createPolicy("finishPos"),
							],
						}
					: setting,
			),
		);
	};

	const removePolicy = (settingId: string, policyId: string) => {
		setRaceSettings((current) =>
			current.map((setting) =>
				setting.id === settingId
					? {
							...setting,
							policies: setting.policies.filter(
								(policy) => policy.id !== policyId,
							),
						}
					: setting,
			),
		);
	};

	const updatePolicyType = (
		settingId: string,
		policyId: string,
		type: PolicyType,
	) => {
		setRaceSettings((current) =>
			current.map((setting) => {
				if (setting.id !== settingId) {
					return setting;
				}

				return {
					...setting,
					policies: setting.policies.map((policy) => {
						if (policy.id !== policyId) {
							return policy;
						}

						return {
							...policy,
							type,
							tables:
								type === "incidentsExceeded"
									? []
									: policy.tables.length > 0
										? policy.tables
										: [emptyTable()],
							rules:
								type === "incidentsExceeded"
									? policy.rules.length > 0
										? policy.rules
										: [emptyThresholdRule()]
									: [],
						};
					}),
				};
			}),
		);
	};

	const addTable = (settingId: string, policyId: string) => {
		setRaceSettings((current) =>
			current.map((setting) =>
				setting.id === settingId
					? {
							...setting,
							policies: setting.policies.map((policy) =>
								policy.id === policyId
									? {
											...policy,
											tables: [
												...policy.tables,
												emptyTable(),
											],
										}
									: policy,
							),
						}
					: setting,
			),
		);
	};

	const updateTable = (
		settingId: string,
		policyId: string,
		tableId: string,
		values: string,
	) => {
		setRaceSettings((current) =>
			current.map((setting) =>
				setting.id === settingId
					? {
							...setting,
							policies: setting.policies.map((policy) =>
								policy.id === policyId
									? {
											...policy,
											tables: policy.tables.map(
												(table) =>
													table.id === tableId
														? { ...table, values }
														: table,
											),
										}
									: policy,
							),
						}
					: setting,
			),
		);
	};

	const removeTable = (
		settingId: string,
		policyId: string,
		tableId: string,
	) => {
		setRaceSettings((current) =>
			current.map((setting) =>
				setting.id === settingId
					? {
							...setting,
							policies: setting.policies.map((policy) =>
								policy.id === policyId
									? {
											...policy,
											tables: policy.tables.filter(
												(table) => table.id !== tableId,
											),
										}
									: policy,
							),
						}
					: setting,
			),
		);
	};

	const addThresholdRule = (settingId: string, policyId: string) => {
		setRaceSettings((current) =>
			current.map((setting) =>
				setting.id === settingId
					? {
							...setting,
							policies: setting.policies.map((policy) =>
								policy.id === policyId
									? {
											...policy,
											rules: [
												...policy.rules,
												emptyThresholdRule(),
											],
										}
									: policy,
							),
						}
					: setting,
			),
		);
	};

	const updateThresholdRule = (
		settingId: string,
		policyId: string,
		ruleId: string,
		patch: Partial<
			Pick<DraftThresholdRule, "threshold" | "penaltyPercent">
		>,
	) => {
		setRaceSettings((current) =>
			current.map((setting) =>
				setting.id === settingId
					? {
							...setting,
							policies: setting.policies.map((policy) =>
								policy.id === policyId
									? {
											...policy,
											rules: policy.rules.map((rule) =>
												rule.id === ruleId
													? { ...rule, ...patch }
													: rule,
											),
										}
									: policy,
							),
						}
					: setting,
			),
		);
	};

	const removeThresholdRule = (
		settingId: string,
		policyId: string,
		ruleId: string,
	) => {
		setRaceSettings((current) =>
			current.map((setting) =>
				setting.id === settingId
					? {
							...setting,
							policies: setting.policies.map((policy) =>
								policy.id === policyId
									? {
											...policy,
											rules: policy.rules.filter(
												(rule) => rule.id !== ruleId,
											),
										}
									: policy,
							),
						}
					: setting,
			),
		);
	};

	const handleDelete = async () => {
		if (!isEditing) {
			return;
		}

		setIsDeleting(true);
		try {
			const response = await getCommandClient().deletePointSystem({
				pointSystemId,
			});
			if (!response.deleted) {
				const errorMessage = "Point system was not deleted by backend.";
				setGrpcError(errorMessage);
				void message.warning(errorMessage);
				return;
			}

			setGrpcError(null);
			void message.success("Point system deleted.");
			navigate("/point-systems/manage");
		} catch (error) {
			const errorMessage = `Failed to delete point system: ${String(error)}`;
			setGrpcError(errorMessage);
			void message.error(errorMessage);
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<Space orientation="vertical" size={16} style={{ width: "100%" }}>
			<Space>
				<Button
					icon={<ArrowLeftOutlined />}
					onClick={() => navigate("/point-systems/manage")}
				>
					Back
				</Button>
				<Title level={2} style={{ margin: 0 }}>
					{isEditing ? "Edit Point System" : "New Point System"}
				</Title>
			</Space>

			<Card loading={isLoading}>
				{grpcError ? (
					<Alert
						type="error"
						showIcon
						title={grpcError}
						style={{ marginBottom: 16 }}
					/>
				) : null}

				<Form
					form={form}
					layout="vertical"
					initialValues={DEFAULT_FORM_VALUES}
				>
					<Form.Item
						label="Name"
						name="name"
						rules={[
							{ required: true, message: "Please enter a name." },
						]}
					>
						<Input placeholder="Sprint Championship" />
					</Form.Item>

					<Form.Item label="Description" name="description">
						<Input.TextArea
							placeholder="Point system details"
							autoSize={{ minRows: 2, maxRows: 5 }}
						/>
					</Form.Item>

					<Space size={24} wrap>
						<Form.Item
							label="Min race distance (%)"
							name="minRaceDistancePercent"
							rules={[
								{
									required: true,
									message:
										"Please enter minimum race distance.",
								},
							]}
						>
							<InputNumber min={0} max={100} precision={0} />
						</Form.Item>

						<Form.Item
							label="Guests eligible"
							name="guests"
							valuePropName="checked"
						>
							<Switch />
						</Form.Item>
					</Space>

					<Divider orientation="horizontal">Race Settings</Divider>

					<Card style={{ width: "100%", marginBottom: 16 }}>
						<p>Definition of point policies per race.</p>
						<p>
							If there are more races per event than race
							settings, the last one will be applied to the
							remaining races.
						</p>
						<p>
							If there are multiple grids per race, add an
							additional points table if the points differ. If
							there are more grids per race than points tables,
							the last one will be applied to the remaining grids.
						</p>
					</Card>

					<Space
						orientation="vertical"
						size={16}
						style={{ width: "100%" }}
					>
						{raceSettings.map((setting, settingIndex) => (
							<Card
								key={setting.id}
								title={`Settings for Race ${settingIndex + 1}`}
								extra={
									<Button
										type="text"
										danger
										icon={<DeleteOutlined />}
										onClick={() =>
											removeRaceSetting(setting.id)
										}
									/>
								}
							>
								<Space
									orientation="vertical"
									size={12}
									style={{ width: "100%" }}
								>
									<Input
										placeholder="Race setting name"
										value={setting.name}
										onChange={(event) =>
											updateRaceSettingName(
												setting.id,
												event.target.value,
											)
										}
									/>

									{setting.policies.map(
										(policy, policyIndex) => (
											<Card
												key={policy.id}
												type="inner"
												title={`Policy ${policyIndex + 1}`}
												extra={
													<Button
														type="text"
														danger
														icon={
															<DeleteOutlined />
														}
														onClick={() =>
															removePolicy(
																setting.id,
																policy.id,
															)
														}
													/>
												}
											>
												<Space
													orientation="vertical"
													size={10}
													style={{ width: "100%" }}
												>
													<Select<PolicyType>
														options={policyOptions}
														value={policy.type}
														onChange={(value) =>
															updatePolicyType(
																setting.id,
																policy.id,
																value,
															)
														}
													/>

													{policy.type ===
													"incidentsExceeded" ? (
														<Space
															orientation="vertical"
															size={8}
															style={{
																width: "100%",
															}}
														>
															{policy.rules.map(
																(rule) => (
																	<Space
																		key={
																			rule.id
																		}
																		align="baseline"
																		wrap
																		style={{
																			width: "100%",
																		}}
																	>
																		<Text
																			style={{
																				minWidth: 80,
																			}}
																		>
																			Incidents
																		</Text>
																		<InputNumber
																			min={
																				0
																			}
																			precision={
																				0
																			}
																			value={
																				rule.threshold
																			}
																			onChange={(
																				value,
																			) =>
																				updateThresholdRule(
																					setting.id,
																					policy.id,
																					rule.id,
																					{
																						threshold:
																							value ??
																							0,
																					},
																				)
																			}
																		/>
																		<Text
																			style={{
																				minWidth: 120,
																			}}
																		>
																			Penalty
																			percent
																		</Text>
																		<InputNumber
																			min={
																				0
																			}
																			max={
																				100
																			}
																			precision={
																				0
																			}
																			value={
																				rule.penaltyPercent
																			}
																			onChange={(
																				value,
																			) =>
																				updateThresholdRule(
																					setting.id,
																					policy.id,
																					rule.id,
																					{
																						penaltyPercent:
																							value ??
																							0,
																					},
																				)
																			}
																		/>
																		<Button
																			type="text"
																			danger
																			icon={
																				<DeleteOutlined />
																			}
																			onClick={() =>
																				removeThresholdRule(
																					setting.id,
																					policy.id,
																					rule.id,
																				)
																			}
																		/>
																	</Space>
																),
															)}

															<Button
																type="dashed"
																icon={
																	<PlusOutlined />
																}
																onClick={() =>
																	addThresholdRule(
																		setting.id,
																		policy.id,
																	)
																}
															>
																Add Rule
															</Button>
														</Space>
													) : (
														<Space
															orientation="vertical"
															size={8}
															style={{
																width: "100%",
															}}
														>
															{policy.tables.map(
																(table) => (
																	<Space
																		key={
																			table.id
																		}
																		align="baseline"
																		wrap
																		style={{
																			width: "100%",
																		}}
																	>
																		<Text
																			style={{
																				minWidth: 60,
																			}}
																		>
																			Points
																		</Text>
																		<Input
																			placeholder="Points by position, e.g. 25, 18, 15, 12"
																			value={
																				table.values
																			}
																			style={{
																				width: getPolicyInputWidth(
																					policy.type,
																				),
																			}}
																			onChange={(
																				event,
																			) =>
																				updateTable(
																					setting.id,
																					policy.id,
																					table.id,
																					event
																						.target
																						.value,
																				)
																			}
																		/>
																		<Button
																			type="text"
																			danger
																			icon={
																				<DeleteOutlined />
																			}
																			onClick={() =>
																				removeTable(
																					setting.id,
																					policy.id,
																					table.id,
																				)
																			}
																		/>
																	</Space>
																),
															)}

															<Button
																type="dashed"
																icon={
																	<PlusOutlined />
																}
																onClick={() =>
																	addTable(
																		setting.id,
																		policy.id,
																	)
																}
															>
																Add Points Table
															</Button>
														</Space>
													)}
												</Space>
											</Card>
										),
									)}

									<Button
										type="dashed"
										icon={<PlusOutlined />}
										onClick={() => addPolicy(setting.id)}
									>
										Add Policy
									</Button>
								</Space>
							</Card>
						))}

						<Button
							type="dashed"
							icon={<PlusOutlined />}
							onClick={addRaceSetting}
						>
							Add Race Setting
						</Button>
					</Space>

					<Space>
						<Button
							type="primary"
							icon={<SaveOutlined />}
							loading={isSaving}
							onClick={() => void handleSave()}
						>
							Save
						</Button>

						{isEditing ? (
							<Popconfirm
								title="Delete Point System"
								description="Are you sure you want to delete this point system?"
								onConfirm={() => void handleDelete()}
								okText="Yes"
								cancelText="No"
							>
								<Button danger loading={isDeleting}>
									Delete
								</Button>
							</Popconfirm>
						) : null}
					</Space>
				</Form>
			</Card>
		</Space>
	);
}
