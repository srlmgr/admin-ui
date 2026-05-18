import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "../components/Layout/AppLayout";
import { CallbackPage } from "../pages/Callback/CallbackPage";
import { CarsPage } from "../pages/Cars/CarsPage";
import { DriversPage } from "../pages/Drivers/DriversPage";
import { LoginPage } from "../pages/Login/LoginPage";
import { SeasonEditPage } from "../pages/Seasons/EditPage";
import { SeasonManagePage } from "../pages/Seasons/ManagePage";
import { SeasonsPage } from "../pages/Seasons/SeasonsPage";
import { SeriesPage } from "../pages/Series/SeriesPage";
import { SimulationPage } from "../pages/Simulation/SimulationPage";
import { TracksPage } from "../pages/Tracks/TracksPage";
import { UsersPage } from "../pages/Users/UsersPage";

export const router = createBrowserRouter([
	{
		path: "/login",
		element: <LoginPage />,
	},
	{
		path: "/callback",
		element: <CallbackPage />,
	},
	{
		path: "/",
		element: <AppLayout />,
		children: [
			{ index: true, element: <Navigate to="/users" replace /> },
			{ path: "users", element: <UsersPage /> },
			{ path: "drivers", element: <DriversPage /> },
			{ path: "simulation", element: <SimulationPage /> },
			{ path: "series", element: <SeriesPage /> },
			{ path: "seasons", element: <SeasonsPage /> },
			{ path: "seasons/new", element: <SeasonEditPage /> },
			{ path: "seasons/:seasonId/edit", element: <SeasonEditPage /> },
			{ path: "seasons/:seasonId/manage", element: <SeasonManagePage /> },
			{ path: "tracks", element: <TracksPage /> },
			{ path: "cars", element: <CarsPage /> },
		],
	},
	{
		path: "*",
		element: <Navigate to="/" replace />,
	},
]);
