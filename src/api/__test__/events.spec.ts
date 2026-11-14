import { resolveMappings } from "@/api/events";
import { describe, expect, it, vi } from "vitest";

const { resolve } = vi.hoisted(() => ({ resolve: vi.fn() }));

vi.mock("@/api/grpcClients", () => ({
	getImportClient: () => ({ resolveMappings: resolve }),
}));

describe("resolveMappings", () => {
	it("returns the number of unresolved mappings from the new response", async () => {
		resolve.mockResolvedValue({
			unresolvedMappings: [{}, {}],
		});

		await expect(resolveMappings({ gridId: 4 })).resolves.toBe(2);
		expect(resolve).toHaveBeenCalledWith({ raceGridId: 4 });
	});
});
