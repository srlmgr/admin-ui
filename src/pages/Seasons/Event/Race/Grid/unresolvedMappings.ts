import {
	SourceEntityType,
	type SourceEntity,
	type UnresolvedMapping,
} from "@buf/srlmgr_api.bufbuild_es/backend/common/v1/mapping_pb";

function describeSource(source: SourceEntity | undefined): string {
	const details = [
		source?.name ? `"${source.name}"` : undefined,
		source?.id ? `source ID: ${source.id}` : undefined,
	].filter((value) => value !== undefined);
	return details.length > 0 ? ` (${details.join(", ")})` : "";
}

function sourceEntityTypeName(type: SourceEntityType): string {
	switch (type) {
		case SourceEntityType.TRACK:
			return "Track";
		case SourceEntityType.DRIVER:
			return "Driver";
		case SourceEntityType.CAR:
			return "Car";
		case SourceEntityType.UNSPECIFIED:
			return "Entity";
		default:
			return `Entity (type ${type})`;
	}
}

export function formatUnresolvedMappingReason(
	mapping: UnresolvedMapping,
): string {
	const reason = mapping.reason;
	switch (reason.case) {
		case "sourceEntityNotFound":
			return `${sourceEntityTypeName(reason.value.entityType)}${describeSource(reason.value.source)} was not found.`;
		case "seasonDriverNotActive":
			return `Driver with ID ${reason.value.driverId}${describeSource(reason.value.sourceDriver)} is not active in the season.`;
		case "seasonCarNotConfigured":
			return `Car model variant ID ${reason.value.carModelVariantId}${describeSource(reason.value.sourceCar)} is not configured for the season.`;
		case "teamNotFound": {
			const drivers = reason.value.driversChecked
				.map(
					(driver) =>
						`#${driver.driverId}${describeSource(driver.sourceDriver)}`,
				)
				.join(", ");
			return `Team "${reason.value.sourceTeamName}" was not found.${drivers ? ` Drivers checked: ${drivers}.` : ""}`;
		}
		case "teamDriversMissing":
			return `Team "${reason.value.sourceTeamName}" has no drivers to match.`;
		case "carClassNotConfigured":
			return `No car class is configured for car model variant #${reason.value.carModelVariantId}${describeSource(reason.value.sourceCar)}.`;
		case "carNumberMismatch": {
			const configured =
				reason.value.configuredNumber === undefined
					? "unavailable"
					: `"${reason.value.configuredNumber}"`;
			return `Imported car number "${reason.value.importedNumber}" does not match the configured number (${configured}).`;
		}
		case undefined:
			return "No diagnostic reason provided.";
	}
}
