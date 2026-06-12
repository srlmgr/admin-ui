import { listAllCarModelOptions, type CarModelOption } from "@/api/cars";
import { createSeasonTeam, updateSeasonTeam } from "@/api/seasons";
import type { Timestamp } from "@bufbuild/protobuf/wkt";
import { DatePicker, Form, Input, Modal, Select, Switch, message } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";

export type SeasonTeamRowData = {
	teamId: number;
	name: string;
	isActive: boolean;
	carModelId: number;
	carModelName: string;
	carNumber: string;
	joinedAt?: Timestamp;
	leftAt?: Timestamp;
};

type SeasonTeamFormValues = {
	name: string;
	isActive: boolean;
	carModelId: number;
	carNumber: string;
	joinedAt?: Dayjs;
	leftAt?: Dayjs;
};

type SeasonTeamModalProps = {
	open: boolean;
	seasonId: number;
	isTeamBased: boolean;
	editRow?: SeasonTeamRowData;
	onCancel: () => void;
	onSaved: () => void;
};

function timestampToDayjs(ts?: Timestamp): Dayjs | undefined {
	if (!ts) {
		return undefined;
	}
	const secs = Number(ts.seconds ?? 0n);
	if (!Number.isFinite(secs)) {
		return undefined;
	}
	return dayjs(new Date(secs * 1000));
}

function dayjsToDate(value?: Dayjs): Date | undefined {
	return value?.isValid() ? value.toDate() : undefined;
}

export function SeasonTeamModal({
	open,
	seasonId,
	isTeamBased,
	editRow,
	onCancel,
	onSaved,
}: SeasonTeamModalProps) {
	const [form] = Form.useForm<SeasonTeamFormValues>();
	const [carModelOptions, setCarModelOptions] = useState<CarModelOption[]>(
		[],
	);
	const [isLoadingOptions, setIsLoadingOptions] = useState(false);
	const [isSaving, setIsSaving] = useState(false);

	const isEditMode = Boolean(editRow);

	const initialValues = useMemo(
		() => ({
			name: editRow?.name ?? "",
			isActive: editRow?.isActive ?? true,
			carModelId: editRow?.carModelId ?? 0,
			carNumber: editRow?.carNumber ?? "",
			joinedAt: timestampToDayjs(editRow?.joinedAt),
			leftAt: timestampToDayjs(editRow?.leftAt),
		}),
		[editRow],
	);

	const loadOptions = useCallback(async () => {
		setIsLoadingOptions(true);
		try {
			const items = await listAllCarModelOptions();
			setCarModelOptions(items);
		} catch (error) {
			void message.error(`Failed to load options: ${String(error)}`);
		} finally {
			setIsLoadingOptions(false);
		}
	}, []);

	useEffect(() => {
		if (!open) {
			return;
		}

		const timeoutId = window.setTimeout(() => {
			form.resetFields();
			form.setFieldsValue(initialValues);
			void loadOptions();
		}, 0);

		return () => {
			window.clearTimeout(timeoutId);
		};
	}, [form, initialValues, loadOptions, open]);

	const handleSubmit = useCallback(async () => {
		try {
			const values = await form.validateFields();
			setIsSaving(true);

			const normalizedCarNumber = values.carNumber?.trim();
			const teamCarFields = isTeamBased
				? {
						carModelId: values.carModelId,
						carNumber:
							normalizedCarNumber &&
							normalizedCarNumber.length > 0
								? normalizedCarNumber
								: undefined,
					}
				: {};

			if (isEditMode && editRow) {
				await updateSeasonTeam(editRow.teamId, {
					seasonId,
					name: values.name.trim(),
					isActive: values.isActive,
					...teamCarFields,
					joinedAt: dayjsToDate(values.joinedAt),
					leftAt: dayjsToDate(values.leftAt),
				});
				void message.success("Season team updated.");
			} else {
				await createSeasonTeam({
					seasonId,
					name: values.name.trim(),
					isActive: values.isActive,
					...teamCarFields,
					joinedAt: dayjsToDate(values.joinedAt),
				});
				void message.success("Season team added.");
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
				`Failed to ${isEditMode ? "update" : "add"} season team: ${String(error)}`,
			);
		} finally {
			setIsSaving(false);
		}
	}, [editRow, form, isEditMode, isTeamBased, onSaved, seasonId]);

	const carModelSelectOptions = carModelOptions.map((c) => ({
		value: c.carModelId,
		label: c.label,
	}));

	return (
		<Modal
			title={isEditMode ? "Edit season team" : "New season team"}
			open={open}
			onCancel={onCancel}
			onOk={() => void handleSubmit()}
			okText={isEditMode ? "Save" : "Add"}
			okButtonProps={{ loading: isSaving }}
			destroyOnHidden
		>
			<Form form={form} layout="vertical" initialValues={initialValues}>
				<Form.Item
					label="Team Name"
					name="name"
					rules={[
						{ required: true, message: "Team name is required" },
						{ whitespace: true, message: "Team name is required" },
					]}
				>
					<Input placeholder="Team name" />
				</Form.Item>

				<Form.Item
					label="Active"
					name="isActive"
					valuePropName="checked"
				>
					<Switch />
				</Form.Item>

				{isTeamBased ? (
					<>
						<Form.Item
							label="Car Model"
							name="carModelId"
							rules={[
								{
									required: true,
									message: "Car model is required",
								},
							]}
						>
							<Select
								showSearch
								loading={isLoadingOptions}
								placeholder="Select car model"
								optionFilterProp="label"
								filterOption={(input, option) =>
									String(option?.label ?? "")
										.toLowerCase()
										.includes(input.toLowerCase())
								}
								options={carModelSelectOptions}
							/>
						</Form.Item>
						<Form.Item
							label="Car Number"
							name="carNumber"
							rules={[
								{
									required: true,
									message: "Car number is required",
								},
								{
									whitespace: true,
									message: "Car number is required",
								},
							]}
						>
							<Input placeholder="e.g. 42" />
						</Form.Item>
					</>
				) : null}

				<Form.Item label="Joined At" name="joinedAt">
					<DatePicker
						showTime={{ format: "HH:mm", showSecond: false }}
						format="YYYY-MM-DD HH:mm"
						style={{ width: "100%" }}
					/>
				</Form.Item>

				{isEditMode ? (
					<Form.Item label="Left At" name="leftAt">
						<DatePicker
							showTime={{ format: "HH:mm", showSecond: false }}
							format="YYYY-MM-DD HH:mm"
							style={{ width: "100%" }}
						/>
					</Form.Item>
				) : null}
			</Form>
		</Modal>
	);
}
