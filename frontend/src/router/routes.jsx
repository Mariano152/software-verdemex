import { Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute/ProtectedRoute';
import Dashboard from '../pages/Dashboard/Dashboard';
import Login from '../components/Login/Login';

// Importar componentes del módulo de Vehículos
import VehiclesList from '../pages/Vehicles/VehiclesList';
import VehicleCreate from '../pages/Vehicles/VehicleCreate';
import VehicleEdit from '../pages/Vehicles/VehicleEdit';
import VehicleDetail from '../pages/Vehicles/VehicleDetail';
import VehicleFile from '../pages/Vehicles/VehicleFile';
import VehicleEventCreate from '../pages/Vehicles/VehicleEventCreate';
import VehicleStatusHistory from '../pages/Vehicles/VehicleStatusHistory';
import VehicleQRView from '../pages/Vehicles/VehicleQRView';

// Importar componentes del módulo de Conductores
import DriversList from '../pages/Drivers/DriversList';
import DriverCreate from '../pages/Drivers/DriverCreate';
import DriverEdit from '../pages/Drivers/DriverEdit';
import DriverDetail from '../pages/Drivers/DriverDetail';
import DriverAssignments from '../pages/Drivers/DriverAssignments';
import DriverRatings from '../pages/Drivers/DriverRatings';

// Importar componentes del módulo de Pedidos
import OrdersList from '../pages/Orders/OrdersList';
import OrderCreate from '../pages/Orders/OrderCreate';
import OrderEdit from '../pages/Orders/OrderEdit';
import OrderDetail from '../pages/Orders/OrderDetail';
import OrdersBoard from '../pages/Orders/OrdersBoard';

// Importar componentes del módulo de Analytics
import AnalyticsDashboard from '../pages/Analytics/AnalyticsDashboard';
import VehicleReports from '../pages/Reports/VehicleReports';
import DriverReports from '../pages/Reports/DriverReports';
import OrderReports from '../pages/Reports/OrderReports';

// Importar componentes del módulo de Usuarios
import UsersList from '../pages/Users/UsersList';
import UserCreate from '../pages/Users/UserCreate';
import UserEdit from '../pages/Users/UserEdit';
import Profile from '../pages/Users/Profile';

// Importar componentes de Error
import NotFound from '../pages/Errors/NotFound';
import Unauthorized from '../pages/Errors/Unauthorized';

// Rutas configuradas
export const routes = [
  {
    path: '/',
    element: <Login />,
  },
  {
    path: '/dashboard',
    element: <ProtectedRoute element={<Dashboard />} />,
  },
  // Rutas de Vehículos
  {
    path: '/vehicles',
    element: <ProtectedRoute element={<VehiclesList />} />,
  },
  {
    path: '/vehicles/create',
    element: <ProtectedRoute element={<VehicleCreate />} />,
  },
  {
    path: '/vehicles/:id',
    element: <ProtectedRoute element={<VehicleDetail />} />,
  },
  {
    path: '/vehicles/:id/edit',
    element: <ProtectedRoute element={<VehicleEdit />} />,
  },
  {
    path: '/vehicles/:id/file',
    element: <ProtectedRoute element={<VehicleFile />} />,
  },
  {
    path: '/vehicles/:id/event',
    element: <ProtectedRoute element={<VehicleEventCreate />} />,
  },
  {
    path: '/vehicles/:id/history',
    element: <ProtectedRoute element={<VehicleStatusHistory />} />,
  },
  {
    path: '/vehicles/:id/qr',
    element: <ProtectedRoute element={<VehicleQRView />} />,
  },
  // Rutas de Conductores
  {
    path: '/drivers',
    element: <ProtectedRoute element={<DriversList />} />,
  },
  {
    path: '/drivers/create',
    element: <ProtectedRoute element={<DriverCreate />} />,
  },
  {
    path: '/drivers/:id',
    element: <ProtectedRoute element={<DriverDetail />} />,
  },
  {
    path: '/drivers/:id/edit',
    element: <ProtectedRoute element={<DriverEdit />} />,
  },
  {
    path: '/drivers/:id/assignments',
    element: <ProtectedRoute element={<DriverAssignments />} />,
  },
  {
    path: '/drivers/:id/ratings',
    element: <ProtectedRoute element={<DriverRatings />} />,
  },
  // Rutas de Pedidos
  {
    path: '/orders',
    element: <ProtectedRoute element={<OrdersList />} />,
  },
  {
    path: '/orders/create',
    element: <ProtectedRoute element={<OrderCreate />} />,
  },
  {
    path: '/orders/:id',
    element: <ProtectedRoute element={<OrderDetail />} />,
  },
  {
    path: '/orders/:id/edit',
    element: <ProtectedRoute element={<OrderEdit />} />,
  },
  {
    path: '/orders/board',
    element: <ProtectedRoute element={<OrdersBoard />} />,
  },
  // Rutas de Analytics
  {
    path: '/analytics',
    element: <ProtectedRoute element={<AnalyticsDashboard />} />,
  },
  {
    path: '/reports/vehicles',
    element: <ProtectedRoute element={<VehicleReports />} />,
  },
  {
    path: '/reports/drivers',
    element: <ProtectedRoute element={<DriverReports />} />,
  },
  {
    path: '/reports/orders',
    element: <ProtectedRoute element={<OrderReports />} />,
  },
  // Rutas de Usuarios
  {
    path: '/users',
    element: <ProtectedRoute element={<UsersList />} />,
  },
  {
    path: '/users/create',
    element: <ProtectedRoute element={<UserCreate />} />,
  },
  {
    path: '/users/:id/edit',
    element: <ProtectedRoute element={<UserEdit />} />,
  },
  {
    path: '/profile',
    element: <ProtectedRoute element={<Profile />} />,
  },
  // Rutas de Error
  {
    path: '/unauthorized',
    element: <Unauthorized />,
  },
  {
    path: '/404',
    element: <NotFound />,
  },
  {
    path: '/*',
    element: <Navigate to="/404" replace />,
  },
];
