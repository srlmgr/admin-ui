import { store } from "@/store";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginPage } from "../LoginPage";

describe("LoginPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.restoreAllMocks();
	});

	it("should render login button", () => {
		render(
			<Provider store={store}>
				<BrowserRouter>
					<LoginPage />
				</BrowserRouter>
			</Provider>,
		);

		const button = screen.getByRole("button", { name: /sign in/i });
		expect(button).toBeDefined();
	});

	it("should render welcome message", () => {
		render(
			<Provider store={store}>
				<BrowserRouter>
					<LoginPage />
				</BrowserRouter>
			</Provider>,
		);

		expect(
			screen.getByText("SimRacingLeague Manager Administration"),
		).toBeDefined();
		expect(
			screen.getByText("Welcome! Please log in to continue."),
		).toBeDefined();
	});

	it("should set loading state when sign in is clicked", async () => {
		render(
			<Provider store={store}>
				<BrowserRouter>
					<LoginPage />
				</BrowserRouter>
			</Provider>,
		);

		const button = screen.getByRole("button", { name: /sign in/i });
		fireEvent.click(button);

		await waitFor(() => {
			expect(button.className).toContain("ant-btn-loading");
		});
	});
});
