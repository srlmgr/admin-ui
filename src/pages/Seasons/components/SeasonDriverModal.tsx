import { listDrivers } from "@/api/drivers";
import {
	listSeasonCarModelVariants,
	setSeasonDrivers,
	type SeasonDriverEntry,
} from "@/api/seasons";
import type { Driver } from "@buf/srlmgr_api.bufbuild_es/backend/common/v1/common_pb";
import type { Timestamp } from "@bufbuild/protobuf/wkt";
import { DatePicker, Form, Input, Modal, Select, Switch, message } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useCallback, useEffect, useState } from "react";

export type SeasonDriverRowData = {
	seasonDriverId: number;
	driverId: number;
	carModelId: number;
	carModelName?: string;
	carNumber: string;
	isGuestDriver: boolean;
	joinedAt?: Timestamp;
	leftAt?: Timestamp;
};

type SeasonDriverFormValues = {
	driverId: number;
	carModelId: number;
	carNumber: string;
	isGuestDriver: boolean;
	joinedAt?: Dayjs;
	leftAt?: Dayjs;
};

type SeasonCarModelVariantOption = {
	carModelId: number;
	label: string;
};

type SeasonDriverModalProps = {
	open: boolean;
	seasonId: number;
	editRow?: SeasonDriverRowData;
	allRows: SeasonDriverRowData[];
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

function dayjsToDate(d?: Dayjs): Date | undefined {
	return d?.isValid() ? d.toDate() : undefined;
}

export function SeasonDriverModal({
	open,
	seasonId,
	editRow,
	allRows,
	onCancel,
	onSaved,
}: SeasonDriverModalProps) {
	const [form] = Form.useForm<SeasonDriverFormValues>();
	const [drivers, setDrivers] = useState<Driver[]>([]);
	const [carModelOptions, setCarModelOptions] = useState<
		SeasonCarModelVariantOption[]
	>([]);
	const [isLoadingOptions, setIsLoadingOptions] = useState(false);
	const [isSaving, setIsSaving] = useState(false);

	const isEditMode = Boolean(editRow);

	const loadOptions = useCallback(async () => {
		setIsLoadingOptions(true);
		try {
			const [driverItems, carModelItems] = await Promise.all([
				listDrivers(),
				listSeasonCarModelVariants(seasonId),
			]);
			setDrivers(driverItems);
			let options = carModelItems
				.map((m) => ({
					carModelId: Number(m.id),
					label: m.name?.trim() || `Car model variant #${m.id}`,
				}))
				.sort((a, b) => a.label.localeCompare(b.label));

			if (editRow) {
				const selectedId = Number(editRow.carModelId);
				if (
					!options.some((option) => option.carModelId === selectedId)
				) {
					options = [
						{
							carModelId: selectedId,
							label:
								editRow.carModelName?.trim() ||
								`Car model variant #${selectedId}`,
						},
						...options,
					];
				}
			}

			setCarModelOptions(options);
		} catch (error) {
			void message.error(`Failed to load options: ${String(error)}`);
		} finally {
			setIsLoadingOptions(false);
		}
	}, [editRow, seasonId]);

	useEffect(() => {
		if (!open) {
			return;
		}

		const timeoutId = window.setTimeout(() => {
			form.resetFields();
			if (editRow) {
				form.setFieldsValue({
					driverId: editRow.driverId,
					carModelId: Number(editRow.carModelId),
					carNumber: editRow.carNumber,
					isGuestDriver: editRow.isGuestDriver,
					joinedAt: timestampToDayjs(editRow.joinedAt),
					leftAt: timestampToDayjs(editRow.leftAt),
				});
			}
			void loadOptions();
		}, 0);

		return () => {
			window.clearTimeout(timeoutId);
		};
	}, [editRow, form, loadOptions, open]);

	const handleSubmit = useCallback(async () => {
		try {
			const values = await form.validateFields();
			setIsSaving(true);

			const newEntry: SeasonDriverEntry = {
				driverId: values.driverId,
				carModelId: Number(values.carModelId),
				carNumber: values.carNumber.trim(),
				isGuestDriver: values.isGuestDriver ?? false,
				joinedAt: dayjsToDate(values.joinedAt),
				leftAt: dayjsToDate(values.leftAt),
			};

			let updatedEntries: SeasonDriverEntry[];
			if (editRow) {
				updatedEntries = allRows.map((row) =>
					row.seasonDriverId === editRow.seasonDriverId
						? newEntry
						: {
								driverId: row.driverId,
								carModelId: row.carModelId,
								carNumber: row.carNumber,
								isGuestDriver: row.isGuestDriver,
								joinedAt: row.joinedAt
									? new Date(
											Number(row.joinedAt.seconds) * 1000,
										)
									: undefined,
								leftAt: row.leftAt
									? new Date(
											Number(row.leftAt.seconds) * 1000,
										)
									: undefined,
							},
				);
			} else {
				const existingEntries: SeasonDriverEntry[] = allRows.map(
					(row) => ({
						driverId: row.driverId,
						carModelId: row.carModelId,
						carNumber: row.carNumber,
						isGuestDriver: row.isGuestDriver,
						joinedAt: row.joinedAt
							? new Date(Number(row.joinedAt.seconds) * 1000)
							: undefined,
						leftAt: row.leftAt
							? new Date(Number(row.leftAt.seconds) * 1000)
							: undefined,
					}),
				);
				updatedEntries = [...existingEntries, newEntry];
			}

			await setSeasonDrivers(seasonId, updatedEntries);
			void message.success(
				isEditMode ? "Season driver updated." : "Season driver added.",
			);
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
				`Failed to ${isEditMode ? "update" : "add"} season driver: ${String(error)}`,
			);
		} finally {
			setIsSaving(false);
		}
	}, [allRows, editRow, form, isEditMode, onSaved, seasonId]);

	const driverSelectOptions = drivers.map((d) => ({
		value: d.id,
		label: d.name,
	}));

	const carModelSelectOptions = carModelOptions.map((c) => ({
		value: c.carModelId,
		label: c.label,
	}));

	return (
		<Modal
			title={isEditMode ? "Edit season driver" : "New season driver"}
			open={open}
			onCancel={onCancel}
			onOk={() => void handleSubmit()}
			okText={isEditMode ? "Save" : "Add"}
			okButtonProps={{ loading: isSaving }}
			destroyOnHidden
		>
			<Form form={form} layout="vertical">
				<Form.Item
					label="Driver"
					name="driverId"
					rules={[{ required: true, message: "Driver is required" }]}
				>
					<Select
						showSearch
						loading={isLoadingOptions}
						placeholder="Select driver"
						optionFilterProp="label"
						filterOption={(input, option) =>
							String(option?.label ?? "")
								.toLowerCase()
								.includes(input.toLowerCase())
						}
						options={driverSelectOptions}
						disabled={isEditMode}
					/>
				</Form.Item>

				<Form.Item
					label="Car Model Variant"
					name="carModelId"
					rules={[
						{
							required: true,
							message: "Car model variant is required",
						},
					]}
				>
					<Select
						showSearch
						loading={isLoadingOptions}
						placeholder="Select car model variant"
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

				<Form.Item
					label="Guest Driver"
					name="isGuestDriver"
					valuePropName="checked"
					initialValue={false}
				>
					<Switch size="small" />
				</Form.Item>

				<Form.Item label="Joined At" name="joinedAt">
					<DatePicker
						showTime={{ format: "HH:mm", showSecond: false }}
						format="YYYY-MM-DD HH:mm"
						style={{ width: "100%" }}
					/>
				</Form.Item>

				<Form.Item label="Left At" name="leftAt">
					<DatePicker
						showTime={{ format: "HH:mm", showSecond: false }}
						format="YYYY-MM-DD HH:mm"
						style={{ width: "100%" }}
					/>
				</Form.Item>
			</Form>
		</Modal>
	);
}
