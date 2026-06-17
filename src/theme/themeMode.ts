import { createContext, useContext } from "react";

export type ThemeMode = "light" | "dark";

export type ThemeModeContextValue = {
	mode: ThemeMode;
	toggleMode: () => void;
};

export const THEME_STORAGE_KEY = "admin-ui-theme-mode";

export const ThemeModeContext = createContext<
	ThemeModeContextValue | undefined
>(undefined);

export function getStoredThemeMode(): ThemeMode {
	if (typeof window === "undefined") {
		return "light";
	}

	const storedMode = window.localStorage.getItem(THEME_STORAGE_KEY);
	return storedMode === "dark" ? "dark" : "light";
}

export function useThemeMode() {
	const context = useContext(ThemeModeContext);

	if (!context) {
		throw new Error("useThemeMode must be used within ThemeModeProvider");
	}

	return context;
}
