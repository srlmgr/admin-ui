import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { ThemeModeProvider } from "./theme/ThemeModeProvider";

function App() {
	return (
		<ThemeModeProvider>
			<RouterProvider router={router} />
		</ThemeModeProvider>
	);
}

export default App;
