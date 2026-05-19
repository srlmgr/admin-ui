import {
	createTrack,
	getTrack,
	updateTrack,
	type CreateTrackInput,
} from "@/api/tracks";
import { ArrowLeftOutlined } from "@ant-design/icons";
import type { Track } from "@buf/srlmgr_api.bufbuild_es/backend/common/v1/common_pb";
import {
	Button,
	Card,
	Form,
	Input,
	InputNumber,
	Space,
	Spin,
	message,
} from "antd";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export function TrackEditPage() {
	const navigate = useNavigate();
	const { trackId } = useParams<{ trackId: string }>();
	const [form] = Form.useForm();
	const [loading, setLoading] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [track, setTrack] = useState<Track | null>(null);
	const isEditing = trackId && trackId !== "new";

	const loadTrack = useCallback(async () => {
		if (!isEditing) return;
		try {
			setLoading(true);
			const data = await getTrack(Number(trackId));
			if (data) {
				setTrack(data);
				form.setFieldsValue({
					name: data.name,
					country: data.country,
					latitude: data.latitude,
					longitude: data.longitude,
					websiteUrl: data.websiteUrl,
				});
			}
		} catch (error) {
			message.error("Failed to load track");
			console.error(error);
		} finally {
			setLoading(false);
		}
	}, [isEditing, trackId, form]);

	useEffect(() => {
		const timeoutId = window.setTimeout(() => {
			void loadTrack();
		}, 0);
		return () => {
			window.clearTimeout(timeoutId);
		};
	}, [loadTrack]);

	const handleSubmit = async (values: CreateTrackInput) => {
		try {
			setSubmitting(true);
			const payload: CreateTrackInput = {
				...values,
				country:
					typeof values.country === "string" &&
					values.country.trim() === ""
						? undefined
						: values.country,
				latitude: values.latitude ?? undefined,
				longitude: values.longitude ?? undefined,
			};
			if (isEditing && track) {
				await updateTrack({
					...payload,
					trackId: track.id,
				});
				message.success("Track updated successfully");
			} else {
				await createTrack(payload);
				message.success("Track created successfully");
			}
			navigate("/tracks");
		} catch (error) {
			console.error(error);
			message.error(
				isEditing ? "Failed to update track" : "Failed to create track",
			);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div style={{ padding: "24px" }}>
			<Button
				type="text"
				icon={<ArrowLeftOutlined />}
				onClick={() => navigate("/tracks")}
				style={{ marginBottom: "16px" }}
			>
				Back to Tracks
			</Button>

			<Card
				title={
					isEditing
						? `Edit Track: ${track?.name}`
						: "Create New Track"
				}
				style={{ maxWidth: "600px" }}
			>
				<Spin spinning={loading}>
					<Form
						form={form}
						layout="vertical"
						onFinish={handleSubmit}
						disabled={loading}
					>
						<Form.Item
							label="Name"
							name="name"
							rules={[
								{
									required: true,
									message: "Please enter track name",
								},
							]}
						>
							<Input placeholder="e.g., Monza" />
						</Form.Item>

						<Form.Item label="Country" name="country">
							<Input placeholder="e.g., Italy" />
						</Form.Item>

						<Form.Item label="Latitude" name="latitude">
							<InputNumber step={0.0001} placeholder="45.6305" />
						</Form.Item>

						<Form.Item label="Longitude" name="longitude">
							<InputNumber step={0.0001} placeholder="9.2794" />
						</Form.Item>

						<Form.Item label="Website URL" name="websiteUrl">
							<Input
								type="url"
								placeholder="https://example.com"
							/>
						</Form.Item>

						<Form.Item>
							<Space>
								<Button
									type="primary"
									htmlType="submit"
									loading={submitting}
								>
									{isEditing
										? "Update Track"
										: "Create Track"}
								</Button>
								<Button onClick={() => navigate("/tracks")}>
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
