import { Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute/ProtectedRoute';
import Dashboard from '../pages/Dashboard/Dashboard';
import GasolineDashboard from '../pages/Gasoline/GasolineDashboard';
import InventoryDashboard from '../pages/Inventory/InventoryDashboard';
import MaintenanceDashboard from '../pages/Maintenance/MaintenanceDashboard';
import Login from '../components/Login/Login';

import VehiclesList from '../pages/Vehicles/VehiclesList';
import VehicleCreate from '../pages/Vehicles/VehicleCreate';
import VehicleEdit from '../pages/Vehicles/VehicleEdit';
import VehicleDetail from '../pages/Vehicles/VehicleDetail';
import VehicleFile from '../pages/Vehicles/VehicleFile';
import VehicleEventCreate from '../pages/Vehicles/VehicleEventCreate';
import VehicleStatusHistory from '../pages/Vehicles/VehicleStatusHistory';
import VehicleQRView from '../pages/Vehicles/VehicleQRView';

import DriversList from '../pages/Drivers/DriversList';
import DriverCreate from '../pages/Drivers/DriverCreate';
import DriverEdit from '../pages/Drivers/DriverEdit';
import DriverDetail from '../pages/Drivers/DriverDetail';
import DriverAssignments from '../pages/Drivers/DriverAssignments';
import DriverRatings from '../pages/Drivers/DriverRatings';
import DriverGlobalRatingPage from '../pages/Drivers/DriverGlobalRatingPage';

import OrdersList from '../pages/Orders/OrdersList';
import OrderCreate from '../pages/Orders/OrderCreate';
import OrderEdit from '../pages/Orders/OrderEdit';
import OrderDetail from '../pages/Orders/OrderDetail';
import OrdersBoard from '../pages/Orders/OrdersBoard';

import AnalyticsDashboard from '../pages/Analytics/AnalyticsDashboard';
import VehicleReports from '../pages/Reports/VehicleReports';
import DriverReports from '../pages/Reports/DriverReports';
import OrderReports from '../pages/Reports/OrderReports';

import UsersList from '../pages/Users/UsersList';
import UserCreate from '../pages/Users/UserCreate';
import UserEdit from '../pages/Users/UserEdit';
import Profile from '../pages/Users/Profile';

import NotFound from '../pages/Errors/NotFound';
import Unauthorized from '../pages/Errors/Unauthorized';

export const routes = [
  {
    path: '/',
    element: <Login />
  },
  {
    path: '/dashboard',
    element: <ProtectedRoute element={<Dashboard />} />
  },
  {
    path: '/gasoline',
    element: <ProtectedRoute element={<GasolineDashboard />} />
  },
  {
    path: '/inventory',
    element: <ProtectedRoute element={<InventoryDashboard />} />
  },
  {
    path: '/maintenance',
    element: <ProtectedRoute element={<MaintenanceDashboard />} />
  },
  {
    path: '/vehicles',
    element: <ProtectedRoute element={<VehiclesList />} />
  },
  {
    path: '/vehicles/create',
    element: <ProtectedRoute element={<VehicleCreate />} />
  },
  {
    path: '/vehicles/:id',
    element: <ProtectedRoute element={<VehicleDetail />} />
  },
  {
    path: '/vehicles/:id/edit',
    element: <ProtectedRoute element={<VehicleEdit />} />
  },
  {
    path: '/vehicles/:id/file',
    element: <ProtectedRoute element={<VehicleFile />} />
  },
  {
    path: '/vehicles/:id/event',
    element: <ProtectedRoute element={<VehicleEventCreate />} />
  },
  {
    path: '/vehicles/:id/history',
    element: <ProtectedRoute element={<VehicleStatusHistory />} />
  },
  {
    path: '/vehicles/:id/qr',
    element: <ProtectedRoute element={<VehicleQRView />} />
  },
  {
    path: '/drivers',
    element: <ProtectedRoute element={<DriversList />} />
  },
  {
    path: '/calificar',
    element: <ProtectedRoute element={<DriverGlobalRatingPage />} />
  },
  {
    path: '/drivers/create',
    element: <ProtectedRoute element={<DriverCreate />} />
  },
  {
    path: '/drivers/:id',
    element: <ProtectedRoute element={<DriverDetail />} />
  },
  {
    path: '/drivers/:id/edit',
    element: <ProtectedRoute element={<DriverEdit />} />
  },
  {
    path: '/drivers/:id/assignments',
    element: <ProtectedRoute element={<DriverAssignments />} />
  },
  {
    path: '/drivers/:id/ratings',
    element: <ProtectedRoute element={<DriverRatings />} />
  },
  {
    path: '/orders',
    element: <ProtectedRoute element={<OrdersList />} />
  },
  {
    path: '/orders/create',
    element: <ProtectedRoute element={<OrderCreate />} />
  },
  {
    path: '/orders/:id',
    element: <ProtectedRoute element={<OrderDetail />} />
  },
  {
    path: '/orders/:id/edit',
    element: <ProtectedRoute element={<OrderEdit />} />
  },
  {
    path: '/orders/board',
    element: <ProtectedRoute element={<OrdersBoard />} />
  },
  {
    path: '/analytics',
    element: <ProtectedRoute element={<AnalyticsDashboard />} />
  },
  {
    path: '/reports/vehicles',
    element: <ProtectedRoute element={<VehicleReports />} />
  },
  {
    path: '/reports/drivers',
    element: <ProtectedRoute element={<DriverReports />} />
  },
  {
    path: '/reports/orders',
    element: <ProtectedRoute element={<OrderReports />} />
  },
  {
    path: '/users',
    element: <ProtectedRoute element={<UsersList />} />
  },
  {
    path: '/users/create',
    element: <ProtectedRoute element={<UserCreate />} />
  },
  {
    path: '/users/:id/edit',
    element: <ProtectedRoute element={<UserEdit />} />
  },
  {
    path: '/profile',
    element: <ProtectedRoute element={<Profile />} />
  },
  {
    path: '/unauthorized',
    element: <Unauthorized />
  },
  {
    path: '/404',
    element: <NotFound />
  },
  {
    path: '/*',
    element: <Navigate to='/404' replace />
  }
];
