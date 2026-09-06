import {
	createSeasonEvent,
	listPointSystems,
	listTrackLayoutsForSimulation,
	updateSeasonEvent,
} from "@/api/seasons";
import type {
	Event,
	PointSystem,
} from "@buf/srlmgr_api.bufbuild_es/backend/common/v1/common_pb";
import type { TrackLayoutContainer } from "@buf/srlmgr_api.bufbuild_es/backend/query/v1/frontend_pb";
import {
	DatePicker,
	Form,
	Input,
	Modal,
	Select,
	Space,
	Typography,
	message,
} from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";

const { Text } = Typography;

type NewSeasonEventFormValues = {
	name: string;
	eventDate: Dayjs;
	trackLayoutId: number;
	pointSystemId: number;
};

type TrackLayoutOption = {
	value: number;
	label: string;
};

type NewEventModalProps = {
	open: boolean;
	seasonId: number;
	simulationId: number | null;
	seasonPointSystemId: number | null;
	nextSequenceNo: number;
	editEvent?: Event;
	editTrackLayoutId?: number;
	onCancel: () => void;
	onSaved: () => void;
};

function timestampToDayjsDate(
	timestamp?: Event["eventDate"],
): Dayjs | undefined {
	if (!timestamp) {
		return undefined;
	}

	const seconds = Number(timestamp.seconds ?? 0n);
	if (!Number.isFinite(seconds)) {
		return undefined;
	}

	return dayjs(new Date(seconds * 1000));
}

function toTrackLabel(item: TrackLayoutContainer): string {
	const trackName = item.track?.name?.trim() || "-";
	const layoutName = item.trackLayout?.name?.trim() || "";

	if (layoutName === "" || layoutName.startsWith("-")) {
		return trackName;
	}

	return `${trackName} (${layoutName})`;
}

function toLayoutOptions(items: TrackLayoutContainer[]): TrackLayoutOption[] {
	return items
		.filter(
			(
				item,
			): item is TrackLayoutContainer & {
				trackLayout: NonNullable<TrackLayoutContainer["trackLayout"]>;
			} => Boolean(item.trackLayout),
		)
		.map((item) => ({
			value: item.trackLayout.id,
			label: toTrackLabel(item),
		}))
		.sort((a, b) => a.label.localeCompare(b.label));
}

export function NewEventModal({
	open,
	seasonId,
	simulationId,
	seasonPointSystemId,
	nextSequenceNo,
	editEvent,
	editTrackLayoutId,
	onCancel,
	onSaved,
}: NewEventModalProps) {
	const [form] = Form.useForm<NewSeasonEventFormValues>();
	const [layoutOptions, setLayoutOptions] = useState<TrackLayoutOption[]>([]);
	const [pointSystems, setPointSystems] = useState<PointSystem[]>([]);
	const [isLoadingLayouts, setIsLoadingLayouts] = useState(false);
	const [isSaving, setIsSaving] = useState(false);

	const canSubmit = useMemo(
		() => simulationId !== null && layoutOptions.length > 0,
		[layoutOptions.length, simulationId],
	);
	const isEditMode = Boolean(editEvent);

	const loadLayouts = useCallback(async () => {
		if (simulationId === null) {
			setLayoutOptions([]);
			return;
		}

		setIsLoadingLayouts(true);
		try {
			const items = await listTrackLayoutsForSimulation(simulationId);
			setLayoutOptions(toLayoutOptions(items));
		} catch (error) {
			setLayoutOptions([]);
			void message.error(
				`Failed to load track layouts: ${String(error)}`,
			);
		} finally {
			setIsLoadingLayouts(false);
		}
	}, [simulationId]);

	const loadPointSystemOptions = useCallback(async () => {
		try {
			setPointSystems(await listPointSystems());
		} catch (error) {
			setPointSystems([]);
			void message.error(
				`Failed to load point systems: ${String(error)}`,
			);
		}
	}, []);

	useEffect(() => {
		if (!open) {
			return;
		}

		const timeoutId = window.setTimeout(() => {
			form.resetFields();
			if (editEvent) {
				form.setFieldsValue({
					name: editEvent.name,
					eventDate: timestampToDayjsDate(editEvent.eventDate),
					trackLayoutId: editTrackLayoutId,
					pointSystemId: editEvent.pointSystemId,
				});
			} else {
				form.setFieldValue("pointSystemId", seasonPointSystemId);
			}
			void loadLayouts();
			void loadPointSystemOptions();
		}, 0);

		return () => {
			window.clearTimeout(timeoutId);
		};
	}, [
		editEvent,
		editTrackLayoutId,
		form,
		loadLayouts,
		loadPointSystemOptions,
		open,
		seasonPointSystemId,
	]);

	const handleSubmit = useCallback(async () => {
		if (!canSubmit) {
			void message.warning(
				"No track layouts are available for this season simulation.",
			);
			return;
		}

		try {
			const values = await form.validateFields();
			setIsSaving(true);
			if (editEvent) {
				await updateSeasonEvent({
					eventId: editEvent.id,
					seasonId,
					name: values.name,
					eventDate: values.eventDate.toDate(),
					trackLayoutId: values.trackLayoutId,
					pointSystemId: values.pointSystemId,
					sequenceNo: editEvent.sequenceNo,
					status: editEvent.status,
					processingState: editEvent.processingState,
				});
				void message.success("Event updated.");
			} else {
				await createSeasonEvent({
					seasonId,
					name: values.name,
					eventDate: values.eventDate.toDate(),
					trackLayoutId: values.trackLayoutId,
					pointSystemId: values.pointSystemId,
					sequenceNo: nextSequenceNo,
				});
				void message.success("Event created.");
			}
			onSaved();
			form.resetFields();
		} catch (error) {
			if (
				typeof error === "object" &&
				error !== null &&
				"errorFields" in error
			) {
				return;
			}
			void message.error(
				`Failed to ${isEditMode ? "update" : "create"} event: ${String(error)}`,
			);
		} finally {
			setIsSaving(false);
		}
	}, [
		canSubmit,
		editEvent,
		form,
		isEditMode,
		nextSequenceNo,
		onSaved,
		seasonId,
	]);

	return (
		<Modal
			title={isEditMode ? "Edit event" : "New event"}
			open={open}
			onCancel={onCancel}
			onOk={() => void handleSubmit()}
			okText={isEditMode ? "Save" : "Create"}
			okButtonProps={{
				disabled: !canSubmit,
				loading: isSaving,
			}}
			destroyOnHidden
		>
			<Space direction="vertical" size={8} style={{ width: "100%" }}>
				<Text type="secondary">
					Sequence no: {editEvent?.sequenceNo ?? nextSequenceNo}
				</Text>
				<Text type="secondary">
					Available track layouts: {layoutOptions.length}
				</Text>

				<Form form={form} layout="vertical">
					<Form.Item
						label="Name"
						name="name"
						rules={[
							{ required: true, message: "Name is required" },
							{ whitespace: true, message: "Name is required" },
						]}
					>
						<Input placeholder="Event name" />
					</Form.Item>

					<Form.Item
						label="Event date"
						name="eventDate"
						rules={[
							{
								required: true,
								message: "Event date is required",
							},
						]}
					>
						<DatePicker
							showTime={{
								format: "HH:mm",
								showSecond: false,
							}}
							format="YYYY-MM-DD HH:mm"
							style={{ width: "100%" }}
						/>
					</Form.Item>

					<Form.Item
						label="Track"
						name="trackLayoutId"
						rules={[
							{ required: true, message: "Track is required" },
						]}
					>
						<Select
							showSearch
							loading={isLoadingLayouts}
							placeholder="Select track layout"
							optionFilterProp="label"
							filterOption={(input, option) =>
								String(option?.label ?? "")
									.toLowerCase()
									.includes(input.toLowerCase())
							}
							options={layoutOptions}
							notFoundContent={
								isLoadingLayouts
									? "Loading track layouts..."
									: "No track layouts"
							}
						/>
					</Form.Item>

					<Form.Item
						label="Point System"
						name="pointSystemId"
						rules={[
							{
								required: true,
								message: "Point system is required",
							},
						]}
					>
						<Select
							options={pointSystems.map((pointSystem) => ({
								value: pointSystem.id,
								label: pointSystem.name,
							}))}
							placeholder="Select point system"
						/>
					</Form.Item>
				</Form>

				{simulationId === null ? (
					<Text type="warning">
						Unable to determine the simulation for this season.
					</Text>
				) : null}
			</Space>
		</Modal>
	);
}
