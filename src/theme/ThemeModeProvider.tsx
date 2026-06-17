import { theme as antdTheme, ConfigProvider } from "antd";
import { ReactNode, useMemo, useState } from "react";
import {
	getStoredThemeMode,
	THEME_STORAGE_KEY,
	ThemeMode,
	ThemeModeContext,
} from "./themeMode";

type ThemeModeProviderProps = {
	children: ReactNode;
};

export function ThemeModeProvider({ children }: ThemeModeProviderProps) {
	const [mode, setMode] = useState<ThemeMode>(getStoredThemeMode);

	const contextValue = useMemo(
		() => ({
			mode,
			toggleMode: () => {
				setMode((previousMode) => {
					const nextMode = previousMode === "dark" ? "light" : "dark";
					window.localStorage.setItem(THEME_STORAGE_KEY, nextMode);
					return nextMode;
				});
			},
		}),
		[mode],
	);

	return (
		<ThemeModeContext.Provider value={contextValue}>
			<ConfigProvider
				theme={{
					algorithm:
						mode === "dark"
							? antdTheme.darkAlgorithm
							: antdTheme.defaultAlgorithm,
				}}
			>
				{children}
			</ConfigProvider>
		</ThemeModeContext.Provider>
	);
}
