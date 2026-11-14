import { getPreprocessPreview, resolveMappings } from "@/api/events";
import { ResultEntrySchema } from "@buf/srlmgr_api.bufbuild_es/backend/common/v1/common_pb";
import {
	SourceEntityType,
	UnresolvedMappingSchema,
} from "@buf/srlmgr_api.bufbuild_es/backend/common/v1/mapping_pb";
import { create, type MessageInitShape } from "@bufbuild/protobuf";
import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GridPage } from "../GridPage";
import { formatUnresolvedMappingReason } from "../unresolvedMappings";

vi.mock("@/api/events", () => ({
	getPreprocessPreview: vi.fn(),
	resolveMappings: vi.fn().mockResolvedValue({}),
	listRaces: vi.fn().mockResolvedValue([]),
	listRaceGrids: vi.fn().mockResolvedValue([]),
	applyRaceGridResultEdits: vi.fn(),
	uploadGridResults: vi.fn(),
	uploadGridResultsViaApi: vi.fn(),
}));
vi.mock("@/api/seasons", () => ({
	listSeasonEvents: vi.fn().mockResolvedValue({ events: [] }),
}));
vi.mock("@/api/simulations", () => ({ listSimulations: vi.fn() }));
vi.mock("@/pages/Seasons/components/SeasonEntityBreadcrumbs", () => ({
	SeasonEntityBreadcrumbs: () => null,
}));
vi.mock("@/pages/Seasons/Event/components/BookingEntriesTable", () => ({
	BookingEntriesTable: () => null,
}));
vi.mock("@/pages/Seasons/Event/components/GridPenaltiesSection", () => ({
	GridPenaltiesSection: () => null,
}));
vi.mock("@/pages/Seasons/Event/Race/Grid/EditResultRowModal", () => ({
	EditResultRowModal: () => null,
}));

function mapping(input: MessageInitShape<typeof UnresolvedMappingSchema>) {
	return create(UnresolvedMappingSchema, input);
}

describe("unresolved mapping diagnostics", () => {
	it("formats each reason and its relevant details", () => {
		const examples: [
			MessageInitShape<typeof UnresolvedMappingSchema>,
			string,
		][] = [
			[
				{
					reason: {
						case: "sourceEntityNotFound",
						value: {
							entityType: SourceEntityType.TRACK,
							source: { id: "42", name: "Spa" },
						},
					},
				},
				'Track ("Spa", source ID: 42) was not found.',
			],
			[
				{
					reason: {
						case: "seasonDriverNotActive",
						value: {
							driverId: 7,
							sourceDriver: { name: "Alex" },
						},
					},
				},
				'Driver with ID 7 ("Alex") is not active in the season.',
			],
			[
				{
					reason: {
						case: "seasonCarNotConfigured",
						value: {
							carModelVariantId: 8,
							sourceCar: { id: "car-1" },
						},
					},
				},
				"Car model variant ID 8 (source ID: car-1) is not configured for the season.",
			],
			[
				{
					reason: {
						case: "teamNotFound",
						value: {
							sourceTeamName: "Racing",
							driversChecked: [
								{ driverId: 9, sourceDriver: { name: "Sam" } },
							],
						},
					},
				},
				'Team "Racing" was not found. Drivers checked: #9 ("Sam").',
			],
			[
				{
					reason: {
						case: "teamDriversMissing",
						value: { sourceTeamName: "Racing" },
					},
				},
				'Team "Racing" has no drivers to match.',
			],
			[
				{
					reason: {
						case: "carClassNotConfigured",
						value: { carModelVariantId: 8 },
					},
				},
				"No car class is configured for car model variant #8.",
			],
			[
				{
					reason: {
						case: "carNumberMismatch",
						value: {
							owner: { case: "driverId", value: 7 },
							importedNumber: "01",
							configuredNumber: "",
						},
					},
				},
				'Imported car number "01" does not match the configured number ("").',
			],
			[
				{
					reason: {
						case: "carNumberMismatch",
						value: {
							owner: { case: "teamId", value: 3 },
							importedNumber: "4",
						},
					},
				},
				'Imported car number "4" does not match the configured number (unavailable).',
			],
			[{}, "No diagnostic reason provided."],
		];
		for (const [input, expected] of examples) {
			expect(formatUnresolvedMappingReason(mapping(input))).toBe(
				expected,
			);
		}
	});

	beforeEach(() => {
		vi.clearAllMocks();
		Object.defineProperty(window, "matchMedia", {
			writable: true,
			value: vi.fn().mockImplementation((query: string) => ({
				matches: false,
				media: query,
				addListener: vi.fn(),
				removeListener: vi.fn(),
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				dispatchEvent: vi.fn(),
			})),
		});
		Object.defineProperty(globalThis, "ResizeObserver", {
			writable: true,
			value: class {
				observe() {}
				unobserve() {}
				disconnect() {}
			},
		});
	});

	it("shows every diagnostic sorted by result index on load and after validation", async () => {
		const diagnostics = [
			mapping({
				reason: {
					case: "teamDriversMissing",
					value: { sourceTeamName: "Session" },
				},
			}),
			mapping({
				resultEntryId: 202,
				resultIndex: 2,
				reason: {
					case: "teamDriversMissing",
					value: { sourceTeamName: "Second" },
				},
			}),
			mapping({
				resultEntryId: 200,
				resultIndex: 0,
				reason: {
					case: "teamDriversMissing",
					value: { sourceTeamName: "First" },
				},
			}),
			mapping({
				resultEntryId: 201,
				resultIndex: 0,
				reason: {
					case: "teamDriversMissing",
					value: { sourceTeamName: "Also first" },
				},
			}),
		];
		vi.mocked(getPreprocessPreview).mockResolvedValue({
			$typeName: "backend.import.v1.GetPreprocessPreviewResponse",
			rows: [
				create(ResultEntrySchema, { id: 200, finishingPosition: 9 }),
				create(ResultEntrySchema, { id: 201, finishingPosition: 8 }),
				create(ResultEntrySchema, { id: 202, finishingPosition: 4 }),
			],
			unresolvedMappings: diagnostics,
		});
		render(
			<MemoryRouter
				initialEntries={["/seasons/1/events/2/races/3/grids/4"]}
			>
				<Routes>
					<Route
						path="/seasons/:seasonId/events/:eventId/races/:raceId/grids/:gridId"
						element={<GridPage />}
					/>
				</Routes>
			</MemoryRouter>,
		);
		const assertRows = async () => {
			const diagnostic = await screen.findByText(
				'Team "Also first" has no drivers to match.',
			);
			const table = diagnostic.closest("table");
			expect(table).not.toBeNull();
			expect(
				within(table!).getByRole("columnheader", { name: "Pos" })
					.textContent,
			).toBe("Pos");
			expect(within(table!).queryByText("Source Value")).toBeNull();
			const rows = within(table!).getAllByRole("row").slice(1);
			expect(rows.map((row) => row.textContent)).toEqual([
				expect.stringContaining('9Team "First"'),
				expect.stringContaining('8Team "Also first"'),
				expect.stringContaining('4Team "Second"'),
				expect.stringContaining('-Team "Session"'),
			]);
		};
		await assertRows();
		fireEvent.click(screen.getByRole("button", { name: "Validate" }));
		await waitFor(() =>
			expect(resolveMappings).toHaveBeenCalledWith({ gridId: 4 }),
		);
		await waitFor(() =>
			expect(getPreprocessPreview).toHaveBeenCalledTimes(2),
		);
		await assertRows();
	});
});
