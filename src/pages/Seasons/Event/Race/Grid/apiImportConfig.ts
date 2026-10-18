export type ApiImportConfig = {
	label: string;
	inputType: "integer";
};

// Keyed by lower-cased simulation name. Add entries to support more sims.
const API_IMPORT_CONFIGS: Record<string, ApiImportConfig> = {
	iracing: { label: "Subsession-ID", inputType: "integer" },
};

export function getApiImportConfig(
	simulationName: string | undefined,
): ApiImportConfig | undefined {
	if (!simulationName) {
		return undefined;
	}
	return API_IMPORT_CONFIGS[simulationName.trim().toLowerCase()];
}
