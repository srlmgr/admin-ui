import { describe, expect, it } from "vitest";
import { createLoginUrl, getSafeReturnTo } from "../returnTo";

describe("returnTo", () => {
	it("preserves an internal path, query, and hash", () => {
		const returnTo = "/seasons/12/events/9?tab=results#grid";

		expect(getSafeReturnTo(returnTo)).toBe(returnTo);
		expect(
			new URLSearchParams(createLoginUrl(returnTo).split("?")[1]).get(
				"returnTo",
			),
		).toBe(returnTo);
	});

	it.each([
		"https://evil.example/path",
		"//evil.example/path",
		"/\\evil.example/path",
		"/login",
		"/callback",
	])("rejects unsafe return path %s", (returnTo) => {
		expect(getSafeReturnTo(returnTo)).toBeNull();
	});

	it("falls back to the login page for an unsafe destination", () => {
		expect(createLoginUrl("//evil.example/path")).toBe("/login");
	});
});
