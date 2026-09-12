import { getEventStandings } from "@/api/events";
import { SkipMode } from "@buf/srlmgr_api.bufbuild_es/backend/common/v1/common_pb";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RacesPage } from "../RacesPage";

beforeEach(() => {
	Object.defineProperty(window, "matchMedia", {
		writable: true,
		value: vi.fn().mockImplementation((query) => ({
			matches: false,
			media: query,
			onchange: null,
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

vi.mock("@/api/events", () => ({
	getEventStandings: vi.fn().mockResolvedValue({
		primaryStandings: [],
		secondaryStandings: [],
	}),
	listRaces: vi.fn().mockResolvedValue([]),
	listRaceGrids: vi.fn().mockResolvedValue([]),
	computeBookingEntries: vi.fn(),
	createEventRacesAndGrids: vi.fn(),
	deleteRace: vi.fn(),
	updateRaceName: vi.fn(),
}));

vi.mock("@/api/seasons", () => ({
	listSeasonEvents: vi.fn().mockResolvedValue({
		events: [],
		series: undefined,
		season: {
			id: 1,
			name: "Test Season",
			isTeamBased: false,
			isMulticlass: false,
		},
	}),
	listSeasonDrivers: vi.fn().mockResolvedValue([]),
	listSeasonTeams: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/api/carClasses", () => ({
	listCarClasses: vi.fn().mockResolvedValue([]),
	listCarClassModelVariants: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/pages/Seasons/components/SeasonEntityBreadcrumbs", () => ({
	SeasonEntityBreadcrumbs: () => <div>Breadcrumbs</div>,
}));

vi.mock("@/pages/Seasons/Event/components/SummarySection", () => ({
	SummarySection: () => <div>Summary</div>,
}));

describe("RacesPage standings skip mode", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("defaults to never and sends the skip mode in standings requests", async () => {
		render(
			<MemoryRouter initialEntries={["/seasons/1/events/2/races"]}>
				<Routes>
					<Route
						path="/seasons/:seasonId/events/:eventId/races"
						element={<RacesPage />}
					/>
				</Routes>
			</MemoryRouter>,
		);

		expect(screen.getByText("Never")).toBeDefined();

		await waitFor(() => {
			expect(vi.mocked(getEventStandings)).toHaveBeenCalledWith(
				2,
				SkipMode.NEVER,
			);
		});
	});

	it("keeps the standings section collapsed state stable when selecting skip mode", async () => {
		render(
			<MemoryRouter initialEntries={["/seasons/1/events/2/races"]}>
				<Routes>
					<Route
						path="/seasons/:seasonId/events/:eventId/races"
						element={<RacesPage />}
					/>
				</Routes>
			</MemoryRouter>,
		);

		const header = screen
			.getByText("Standings")
			.closest(".ant-collapse-header");
		expect(header?.getAttribute("aria-expanded")).toBe("true");

		fireEvent.mouseDown(screen.getByRole("combobox"));
		expect(header?.getAttribute("aria-expanded")).toBe("true");
	});
});
