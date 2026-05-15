import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '../components/Layout/AppLayout'
import { LoginPage } from '../pages/Login/LoginPage'
import { UsersPage } from '../pages/Users/UsersPage'
import { DriversPage } from '../pages/Drivers/DriversPage'
import { SimulationPage } from '../pages/Simulation/SimulationPage'
import { SeriesPage } from '../pages/Series/SeriesPage'
import { TracksPage } from '../pages/Tracks/TracksPage'
import { CarsPage } from '../pages/Cars/CarsPage'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/users" replace /> },
      { path: 'users', element: <UsersPage /> },
      { path: 'drivers', element: <DriversPage /> },
      { path: 'simulation', element: <SimulationPage /> },
      { path: 'series', element: <SeriesPage /> },
      { path: 'tracks', element: <TracksPage /> },
      { path: 'cars', element: <CarsPage /> },
    ],
  },
])
