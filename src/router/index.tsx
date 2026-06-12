import { GridPage } from "@/pages/Seasons/Event/Race/Grid/GridPage";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "../components/Layout/AppLayout";
import { CallbackPage } from "../pages/Callback/CallbackPage";
import { CarsPage } from "../pages/Cars/CarsPage";
import { CarManagePage } from "../pages/Cars/ManagePage";
import { DriversPage } from "../pages/Drivers/DriversPage";
import { LoginPage } from "../pages/Login/LoginPage";
import { PointSystemEditPage } from "../pages/PointSystem/EditPage";
import { PointSystemManagePage } from "../pages/PointSystem/ManagePage";
import { PointSystemsPage } from "../pages/PointSystem/PointSystemsPage";
import { SeasonEditPage } from "../pages/Seasons/EditPage";
import { RacePage } from "../pages/Seasons/Event/Race/RacePage";
import { RacesPage } from "../pages/Seasons/Event/RacesPage";
import { SeasonManagePage } from "../pages/Seasons/ManagePage";
import { SeasonsPage } from "../pages/Seasons/SeasonsPage";
import { SeriesPage } from "../pages/Series/SeriesPage";
import { SimulationPage } from "../pages/Simulation/SimulationPage";
import { TrackEditPage } from "../pages/Tracks/EditPage";
import { TrackLayoutEditPage } from "../pages/Tracks/LayoutEditPage";
import { TrackLayoutsPage } from "../pages/Tracks/LayoutsPage";
import { TrackManagePage } from "../pages/Tracks/ManagePage";
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
			{ path: "point-systems", element: <PointSystemsPage /> },
			{
				path: "point-systems/manage",
				element: <PointSystemManagePage />,
			},
			{ path: "point-systems/new", element: <PointSystemEditPage /> },
			{
				path: "point-systems/:pointSystemId/edit",
				element: <PointSystemEditPage />,
			},
			{ path: "seasons/new", element: <SeasonEditPage /> },
			{ path: "seasons/:seasonId/edit", element: <SeasonEditPage /> },
			{ path: "seasons/:seasonId/manage", element: <SeasonManagePage /> },
			{
				path: "seasons/:seasonId/events/:eventId",
				element: <RacesPage />,
			},
			{
				path: "seasons/:seasonId/events/:eventId/races/:raceId",
				element: <RacePage />,
			},
			{
				path: "seasons/:seasonId/events/:eventId/races/:raceId/grids/:gridId",
				element: <GridPage />,
			},
			{ path: "tracks", element: <TracksPage /> },
			{ path: "tracks/manage", element: <TrackManagePage /> },
			{ path: "tracks/new", element: <TrackEditPage /> },
			{ path: "tracks/:trackId/edit", element: <TrackEditPage /> },
			{ path: "tracks/:trackId/layouts", element: <TrackLayoutsPage /> },
			{
				path: "tracks/:trackId/layouts/new",
				element: <TrackLayoutEditPage />,
			},
			{
				path: "tracks/:trackId/layouts/:layoutId/edit",
				element: <TrackLayoutEditPage />,
			},
			{ path: "cars", element: <CarsPage /> },
			{ path: "cars/manage", element: <CarManagePage /> },
		],
	},
	{
		path: "*",
		element: <Navigate to="/" replace />,
	},
]);
