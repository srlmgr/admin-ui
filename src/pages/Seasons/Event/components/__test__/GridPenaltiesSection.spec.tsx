import { GridPenaltiesSection } from "@/pages/Seasons/Event/components/GridPenaltiesSection";
import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { listSeasonDrivers, listSeasonTeams } = vi.hoisted(() => ({
	listSeasonDrivers: vi.fn().mockResolvedValue([]),
	listSeasonTeams: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/api/events", () => ({
	addPenalty: vi.fn(),
	deletePenalty: vi.fn(),
	updatePenalty: vi.fn(),
}));
vi.mock("@/api/seasons", () => ({
	listSeasonDrivers,
	listSeasonTeams,
}));

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

describe("GridPenaltiesSection", () => {
	it("does not reload penalty targets when its scope object is recreated", async () => {
		const props = {
			seasonId: 1,
			isSeasonTeamBased: false,
			bookingEntries: [],
			onRefreshBookingEntries: vi.fn(),
		};
		const { rerender } = render(
			<GridPenaltiesSection
				{...props}
				scope={{ case: "gridId", value: 4 }}
			/>,
		);

		await waitFor(() => {
			expect(listSeasonDrivers).toHaveBeenCalledTimes(1);
			expect(listSeasonTeams).toHaveBeenCalledTimes(1);
		});

		rerender(
			<GridPenaltiesSection
				{...props}
				scope={{ case: "gridId", value: 4 }}
			/>,
		);

		expect(listSeasonDrivers).toHaveBeenCalledTimes(1);
		expect(listSeasonTeams).toHaveBeenCalledTimes(1);
	});
});
