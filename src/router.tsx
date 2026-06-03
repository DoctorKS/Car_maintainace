import { createBrowserRouter, Navigate } from 'react-router-dom';
import AuthGuard from './components/AuthGuard';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AddMaintenancePage from './pages/AddMaintenancePage';
import HistoryCalendarPage from './pages/HistoryCalendarPage';
import ByPartIndexPage from './pages/ByPartIndexPage';
import ByPartPage from './pages/ByPartPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <AuthGuard />,
    children: [
      { path: '/', element: <DashboardPage /> },
      { path: '/add', element: <AddMaintenancePage /> },
      { path: '/edit/:visitId', element: <AddMaintenancePage /> },
      { path: '/history', element: <HistoryCalendarPage /> },
      { path: '/by-part', element: <ByPartIndexPage /> },
      { path: '/by-part/:code', element: <ByPartPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
