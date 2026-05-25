import {
	createSeason,
	deleteSeason,
	getSeason,
	listPointSystems,
	listSeasonsOverview,
	seasonToFormValues,
	updateSeason,
	type SeasonFormValues,
	type UpsertSeasonInput,
} from "@/api/seasons";
import { SeasonEntityBreadcrumbs } from "@/pages/Seasons/components/SeasonEntityBreadcrumbs";
import { ArrowLeftOutlined, SaveOutlined } from "@ant-design/icons";
import type { PointSystem } from "@buf/srlmgr_api.bufbuild_es/backend/common/v1/common_pb";
import {
	Alert,
	Button,
	Card,
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
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

const { Title, Text } = Typography;

const NEW_SEASON_DEFAULTS: SeasonFormValues = {
	name: "",
	pointSystemId: 0,
	skipEvents: 0,
	hasTeams: true,
	isTeamBased: false,
	teamPointsTopN: 0,
	isMulticlass: false,
	startsAt: "",
	endsAt: "",
};

export function SeasonEditPage() {
	const [form] = Form.useForm<SeasonFormValues>();
	const navigate = useNavigate();
	const params = useParams();
	const [searchParams] = useSearchParams();

	const seasonId = Number(params.seasonId);
	const isEditing = Number.isFinite(seasonId) && seasonId > 0;
	const querySeriesId = Number(searchParams.get("seriesId"));

	const [seriesId, setSeriesId] = useState<number | null>(
		Number.isFinite(querySeriesId) && querySeriesId > 0
			? querySeriesId
			: null,
	);
	const [seriesName, setSeriesName] = useState<string>("");
	const [seasonName, setSeasonName] = useState<string>("");
	const [pointSystems, setPointSystems] = useState<PointSystem[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [grpcError, setGrpcError] = useState<string | null>(null);

	const loadData = useCallback(async () => {
		setIsLoading(true);
		try {
			const pointSystemItems = await listPointSystems();
			const overviewItems = await listSeasonsOverview();
			const seriesNamesById = new Map<number, string>();
			for (const item of overviewItems) {
				if (!seriesNamesById.has(item.season.seriesId)) {
					seriesNamesById.set(item.season.seriesId, item.seriesName);
				}
			}
			setPointSystems(pointSystemItems);

			if (isEditing) {
				const season = await getSeason(seasonId);
				if (!season) {
					setGrpcError("Season not found.");
					return;
				}
				setSeriesId(season.seriesId);
				setSeriesName(
					seriesNamesById.get(season.seriesId) ??
						`Series #${season.seriesId}`,
				);
				setSeasonName(season.name);
				form.setFieldsValue(seasonToFormValues(season));
				setGrpcError(null);
				return;
			}

			setSeasonName("");
			setSeriesName(
				seriesId
					? (seriesNamesById.get(seriesId) ?? `Series #${seriesId}`)
					: "",
			);

			form.setFieldsValue({
				...NEW_SEASON_DEFAULTS,
				pointSystemId: pointSystemItems[0]?.id ?? 0,
			});
			setGrpcError(null);
		} catch (error) {
			const errorMessage = `Failed to load season data: ${String(error)}`;
			setGrpcError(errorMessage);
			void message.error(errorMessage);
		} finally {
			setIsLoading(false);
		}
	}, [form, isEditing, seasonId, seriesId]);

	useEffect(() => {
		const timeoutId = window.setTimeout(() => {
			void loadData();
		}, 0);

		return () => {
			window.clearTimeout(timeoutId);
		};
	}, [loadData]);

	const canSave = useMemo(() => {
		if (isEditing) {
			return true;
		}
		return seriesId !== null;
	}, [isEditing, seriesId]);

	const handleSave = async () => {
		if (!canSave || seriesId === null) {
			void message.warning("Series id is required to create a season.");
			return;
		}

		try {
			const values = await form.validateFields();
			setIsSaving(true);

			const input: UpsertSeasonInput = {
				seriesId,
				name: values.name,
				pointSystemId: values.pointSystemId,
				skipEvents: values.skipEvents,
				hasTeams: values.hasTeams,
				isTeamBased: values.isTeamBased,
				teamPointsTopN: values.teamPointsTopN,
				isMulticlass: values.isMulticlass,
				startsAt: values.startsAt || undefined,
				endsAt: values.endsAt || undefined,
			};

			if (isEditing) {
				await updateSeason(seasonId, input);
				void message.success("Season updated.");
			} else {
				await createSeason(input);
				void message.success("Season created.");
				navigate("/seasons");
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
			const errorMessage = `Failed to save season: ${String(error)}`;
			setGrpcError(errorMessage);
			void message.error(errorMessage);
		} finally {
			setIsSaving(false);
		}
	};

	const handleDelete = async () => {
		if (!isEditing) {
			return;
		}

		setIsDeleting(true);
		try {
			const deleted = await deleteSeason(seasonId);
			if (!deleted) {
				const errorMessage = "Season was not deleted by backend.";
				setGrpcError(errorMessage);
				void message.warning(errorMessage);
				return;
			}

			setGrpcError(null);
			void message.success("Season deleted.");
			navigate("/seasons");
		} catch (error) {
			const errorMessage = `Failed to delete season: ${String(error)}`;
			setGrpcError(errorMessage);
			void message.error(errorMessage);
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<Space orientation="vertical" size={16} style={{ width: "100%" }}>
			<SeasonEntityBreadcrumbs
				seriesId={seriesId}
				seriesName={seriesName}
				seasonId={isEditing ? seasonId : null}
				seasonName={seasonName}
			/>
			<Space>
				<Button
					icon={<ArrowLeftOutlined />}
					onClick={() => navigate("/seasons")}
				>
					Back
				</Button>
				<Title level={2} style={{ margin: 0 }}>
					{isEditing ? "Edit Season" : "New Season"}
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

				{!isEditing && seriesId === null ? (
					<Alert
						type="warning"
						showIcon
						title="Series id is missing"
						description="Open this page using the New Season button on the Seasons list so the series id is provided."
						style={{ marginBottom: 16 }}
					/>
				) : null}

				<Form form={form} layout="vertical">
					<Form.Item label="Series ID">
						<Text>{seriesId ?? "Not set"}</Text>
					</Form.Item>

					<Form.Item
						label="Name"
						name="name"
						rules={[
							{ required: true, message: "Name is required" },
						]}
					>
						<Input placeholder="Season name" />
					</Form.Item>

					<Space style={{ width: "100%" }} size={16}>
						<Form.Item label="Starts At" name="startsAt">
							<Input type="date" />
						</Form.Item>
						<Form.Item label="Ends At" name="endsAt">
							<Input type="date" />
						</Form.Item>
					</Space>

					<Form.Item label="Point System" name="pointSystemId">
						<Select
							options={pointSystems.map((pointSystem) => ({
								value: pointSystem.id,
								label: pointSystem.name,
							}))}
						/>
					</Form.Item>

					<Space style={{ width: "100%" }} size={16} wrap>
						<Form.Item label="Skip Events" name="skipEvents">
							<InputNumber min={0} style={{ width: 180 }} />
						</Form.Item>
						<Form.Item
							label="Top N Team Entries"
							name="teamPointsTopN"
						>
							<InputNumber min={0} style={{ width: 180 }} />
						</Form.Item>
					</Space>

					<Space style={{ width: "100%" }} size={24} wrap>
						<Form.Item
							label="Teams Supported"
							name="hasTeams"
							valuePropName="checked"
						>
							<Switch />
						</Form.Item>
						<Form.Item
							label="Team Based"
							name="isTeamBased"
							valuePropName="checked"
						>
							<Switch />
						</Form.Item>
						<Form.Item
							label="Multiclass"
							name="isMulticlass"
							valuePropName="checked"
						>
							<Switch />
						</Form.Item>
					</Space>

					<Space>
						<Button
							type="primary"
							icon={<SaveOutlined />}
							onClick={() => void handleSave()}
							loading={isSaving}
							disabled={!canSave || isDeleting}
						>
							Save
						</Button>

						{isEditing ? (
							<Popconfirm
								title="Delete season"
								description="Are you sure you want to delete this season?"
								onConfirm={() => void handleDelete()}
								okButtonProps={{ loading: isDeleting }}
							>
								<Button
									danger
									loading={isDeleting}
									disabled={isSaving}
								>
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
