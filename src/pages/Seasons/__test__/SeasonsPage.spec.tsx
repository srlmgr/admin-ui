import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SeasonsPage } from "../SeasonsPage";

const { listSeasonsOverview, listSeries, listSimulations } = vi.hoisted(() => ({
	listSeasonsOverview: vi.fn(),
	listSeries: vi.fn(),
	listSimulations: vi.fn(),
}));

vi.mock("@/api/seasons", () => ({
	listSeasonsOverview,
	formatTimestamp: (value?: { seconds?: bigint }) => {
		if (!value) return "-";
		const seconds = Number(value.seconds ?? 0n);
		return new Date(seconds * 1000).toISOString().slice(0, 10);
	},
}));

vi.mock("@/api/series", () => ({
	listSeries,
}));

vi.mock("@/api/simulations", () => ({
	listSimulations,
}));

describe("SeasonsPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		Object.defineProperty(window, "matchMedia", {
			writable: true,
			value: vi.fn().mockImplementation((query: string) => ({
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

		listSeasonsOverview.mockImplementation(
			async (includeInactive = false) => {
				if (includeInactive) {
					return [
						{
							season: {
								id: 2,
								name: "Inactive season",
								seriesId: 7,
								startsAt: { seconds: 1n },
								endsAt: { seconds: 2n },
							},
							seriesName: "Inactive series",
							simulationName: "Sim B",
						},
					];
				}

				return [
					{
						season: {
							id: 1,
							name: "Active season",
							seriesId: 7,
							startsAt: { seconds: 3n },
							endsAt: { seconds: 4n },
						},
						seriesName: "Inactive series",
						simulationName: "Sim B",
					},
				];
			},
		);

		listSimulations.mockResolvedValue([{ id: 10, name: "Simulation" }]);
		listSeries.mockResolvedValue([{ id: 7, name: "Series A" }]);
	});

	it("renders dedicated active and inactive season tables", async () => {
		render(
			<BrowserRouter>
				<SeasonsPage />
			</BrowserRouter>,
		);

		await waitFor(() => {
			expect(screen.getByText("Active Seasons")).toBeDefined();
			expect(screen.getByText("Inactive Seasons")).toBeDefined();
		});

		expect(listSeasonsOverview).toHaveBeenCalledWith({
			includeInactive: false,
		});
		expect(listSeasonsOverview).toHaveBeenCalledWith({
			includeInactive: true,
		});
	});
});
