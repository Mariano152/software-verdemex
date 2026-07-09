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

const APP_ADMIN_ROLES = ['admin', 'operador'];

export const routes = [
  {
    path: '/',
    element: <Login />
  },
  {
    path: '/dashboard',
    element: <ProtectedRoute element={<Dashboard />} allowedRoles={APP_ADMIN_ROLES} />
  },
  {
    path: '/gasoline',
    element: <ProtectedRoute element={<GasolineDashboard />} allowedRoles={APP_ADMIN_ROLES} />
  },
  {
    path: '/inventory',
    element: <ProtectedRoute element={<InventoryDashboard />} allowedRoles={APP_ADMIN_ROLES} />
  },
  {
    path: '/maintenance',
    element: <ProtectedRoute element={<MaintenanceDashboard />} allowedRoles={APP_ADMIN_ROLES} />
  },
  {
    path: '/vehicles',
    element: <ProtectedRoute element={<VehiclesList />} allowedRoles={APP_ADMIN_ROLES} />
  },
  {
    path: '/vehicles/create',
    element: <ProtectedRoute element={<VehicleCreate />} allowedRoles={APP_ADMIN_ROLES} />
  },
  {
    path: '/vehicles/:id',
    element: <ProtectedRoute element={<VehicleDetail />} allowedRoles={APP_ADMIN_ROLES} />
  },
  {
    path: '/vehicles/:id/edit',
    element: <ProtectedRoute element={<VehicleEdit />} allowedRoles={APP_ADMIN_ROLES} />
  },
  {
    path: '/vehicles/:id/file',
    element: <ProtectedRoute element={<VehicleFile />} allowedRoles={APP_ADMIN_ROLES} />
  },
  {
    path: '/vehicles/:id/event',
    element: <ProtectedRoute element={<VehicleEventCreate />} allowedRoles={APP_ADMIN_ROLES} />
  },
  {
    path: '/vehicles/:id/history',
    element: <ProtectedRoute element={<VehicleStatusHistory />} allowedRoles={APP_ADMIN_ROLES} />
  },
  {
    path: '/vehicles/:id/qr',
    element: <ProtectedRoute element={<VehicleQRView />} allowedRoles={APP_ADMIN_ROLES} />
  },
  {
    path: '/drivers',
    element: <ProtectedRoute element={<DriversList />} allowedRoles={APP_ADMIN_ROLES} />
  },
  {
    path: '/calificar',
    element: <ProtectedRoute element={<DriverGlobalRatingPage />} allowedRoles={APP_ADMIN_ROLES} />
  },
  {
    path: '/drivers/create',
    element: <ProtectedRoute element={<DriverCreate />} allowedRoles={APP_ADMIN_ROLES} />
  },
  {
    path: '/drivers/:id',
    element: <ProtectedRoute element={<DriverDetail />} allowedRoles={APP_ADMIN_ROLES} />
  },
  {
    path: '/drivers/:id/edit',
    element: <ProtectedRoute element={<DriverEdit />} allowedRoles={APP_ADMIN_ROLES} />
  },
  {
    path: '/drivers/:id/assignments',
    element: <ProtectedRoute element={<DriverAssignments />} allowedRoles={APP_ADMIN_ROLES} />
  },
  {
    path: '/drivers/:id/ratings',
    element: <ProtectedRoute element={<DriverRatings />} allowedRoles={APP_ADMIN_ROLES} />
  },
  {
    path: '/orders',
    element: <ProtectedRoute element={<OrdersList />} allowedRoles={APP_ADMIN_ROLES} />
  },
  {
    path: '/orders/create',
    element: <ProtectedRoute element={<OrderCreate />} allowedRoles={APP_ADMIN_ROLES} />
  },
  {
    path: '/orders/:id',
    element: <ProtectedRoute element={<OrderDetail />} allowedRoles={APP_ADMIN_ROLES} />
  },
  {
    path: '/orders/:id/edit',
    element: <ProtectedRoute element={<OrderEdit />} allowedRoles={APP_ADMIN_ROLES} />
  },
  {
    path: '/orders/board',
    element: <ProtectedRoute element={<OrdersBoard />} allowedRoles={APP_ADMIN_ROLES} />
  },
  {
    path: '/analytics',
    element: <ProtectedRoute element={<AnalyticsDashboard />} allowedRoles={APP_ADMIN_ROLES} />
  },
  {
    path: '/reports/vehicles',
    element: <ProtectedRoute element={<VehicleReports />} allowedRoles={APP_ADMIN_ROLES} />
  },
  {
    path: '/reports/drivers',
    element: <ProtectedRoute element={<DriverReports />} allowedRoles={APP_ADMIN_ROLES} />
  },
  {
    path: '/reports/orders',
    element: <ProtectedRoute element={<OrderReports />} allowedRoles={APP_ADMIN_ROLES} />
  },
  {
    path: '/users',
    element: <ProtectedRoute element={<UsersList />} allowedRoles={['admin']} />
  },
  {
    path: '/users/create',
    element: <ProtectedRoute element={<UserCreate />} allowedRoles={['admin']} />
  },
  {
    path: '/users/:id/edit',
    element: <ProtectedRoute element={<UserEdit />} allowedRoles={['admin']} />
  },
  {
    path: '/profile',
    element: <ProtectedRoute element={<Profile />} allowedRoles={['admin', 'operador', 'conductor']} />
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
