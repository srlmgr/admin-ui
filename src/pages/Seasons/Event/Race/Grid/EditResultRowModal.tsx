import {
	ResultEntryState,
	type ResultEntry,
} from "@buf/srlmgr_api.bufbuild_es/backend/common/v1/common_pb";
import {
	Col,
	Form,
	Input,
	InputNumber,
	Modal,
	Row,
	Select,
	Switch,
} from "antd";
import { useEffect } from "react";

type EditResultRowFormValues = {
	finishingPosition: number;
	carNumber: string;
	rawDriverName: string;
	startingPosition: number;
	completedLaps: number;
	qualiTimeMs: number;
	fastestLapTimeMs: number;
	incidents: number;
	totalTimeMs: number;
	state: ResultEntry["state"];
	adminNotes: string;
	rawTeamName: string;
	rawCarName: string;
	isGuestDriver: boolean;
};

type EditResultRowModalProps = {
	open: boolean;
	row: ResultEntry | null;
	isSaving: boolean;
	onCancel: () => void;
	onSubmit: (updatedRow: ResultEntry) => Promise<void>;
};

const stateOptions = Object.entries(ResultEntryState)
	.filter(([_, value]) => typeof value === "number")
	.map(([label, value]) => ({
		label,
		value: value as ResultEntry["state"],
	}));

export function EditResultRowModal({
	open,
	row,
	isSaving,
	onCancel,
	onSubmit,
}: EditResultRowModalProps) {
	const [form] = Form.useForm<EditResultRowFormValues>();

	useEffect(() => {
		if (!open || !row) {
			return;
		}

		form.setFieldsValue({
			finishingPosition: row.finishingPosition,
			carNumber: row.carNumber,
			rawDriverName: row.rawDriverName,
			startingPosition: row.startingPosition,
			completedLaps: row.completedLaps,
			qualiTimeMs: row.qualiTimeMs,
			fastestLapTimeMs: row.fastestLapTimeMs,
			incidents: row.incidents,
			totalTimeMs: row.totalTimeMs,
			state: row.state,
			adminNotes: row.adminNotes,
			rawTeamName: row.rawTeamName,
			rawCarName: row.rawCarName,
			isGuestDriver: row.isGuestDriver,
		});
	}, [form, open, row]);

	const handleSubmit = async () => {
		if (!row) {
			return;
		}

		const values = await form.validateFields();
		await onSubmit({
			...row,
			...values,
		});
		form.resetFields();
	};

	return (
		<Modal
			title="Edit result row"
			open={open}
			onCancel={onCancel}
			onOk={() => void handleSubmit()}
			okText="Save"
			okButtonProps={{ loading: isSaving }}
			width={640}
			destroyOnHidden
		>
			<Form form={form} layout="vertical" size="small">
				<Row gutter={8}>
					<Col span={6}>
						<Form.Item label="Pos" name="finishingPosition">
							<InputNumber min={0} style={{ width: "100%" }} />
						</Form.Item>
					</Col>
					<Col span={6}>
						<Form.Item label="#" name="carNumber">
							<Input />
						</Form.Item>
					</Col>
					<Col span={6}>
						<Form.Item label="Start" name="startingPosition">
							<InputNumber min={0} style={{ width: "100%" }} />
						</Form.Item>
					</Col>
					<Col span={6}>
						<Form.Item label="Laps" name="completedLaps">
							<InputNumber min={0} style={{ width: "100%" }} />
						</Form.Item>
					</Col>
				</Row>

				<Row gutter={8}>
					<Col span={8}>
						<Form.Item
							label="Raw Driver"
							name="rawDriverName"
							rules={[
								{
									required: true,
									whitespace: true,
									message: "Driver name is required",
								},
							]}
						>
							<Input />
						</Form.Item>
					</Col>
					<Col span={8}>
						<Form.Item label="Raw Team" name="rawTeamName">
							<Input />
						</Form.Item>
					</Col>
					<Col span={8}>
						<Form.Item label="Raw Car" name="rawCarName">
							<Input />
						</Form.Item>
					</Col>
				</Row>

				<Row gutter={8}>
					<Col span={8}>
						<Form.Item label="Quali (ms)" name="qualiTimeMs">
							<InputNumber min={0} style={{ width: "100%" }} />
						</Form.Item>
					</Col>
					<Col span={8}>
						<Form.Item label="Fastest (ms)" name="fastestLapTimeMs">
							<InputNumber min={0} style={{ width: "100%" }} />
						</Form.Item>
					</Col>
					<Col span={8}>
						<Form.Item label="Total (ms)" name="totalTimeMs">
							<InputNumber min={0} style={{ width: "100%" }} />
						</Form.Item>
					</Col>
				</Row>

				<Row gutter={8}>
					<Col span={8}>
						<Form.Item label="Inc" name="incidents">
							<InputNumber min={0} style={{ width: "100%" }} />
						</Form.Item>
					</Col>
					<Col span={8}>
						<Form.Item label="State" name="state">
							<Select options={stateOptions} />
						</Form.Item>
					</Col>
					<Col span={8}>
						<Form.Item
							label="Guest"
							name="isGuestDriver"
							valuePropName="checked"
						>
							<Switch size="small" />
						</Form.Item>
					</Col>
				</Row>

				<Form.Item label="Admin Notes" name="adminNotes">
					<Input.TextArea rows={2} />
				</Form.Item>
			</Form>
		</Modal>
	);
}
