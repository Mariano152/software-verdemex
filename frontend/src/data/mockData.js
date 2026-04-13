// Mock data for the application
// This will be replaced with actual API calls later

export const mockVehicles = [
  {
    id: 1,
    plate: 'VRX-001',
    model: 'Volvo FM 450',
    type: 'Tractocamión',
    status: 'En ruta',
    driverId: 1,
    fuelLevel: 85,
    mileage: 125000,
    lastMaintenance: '2024-02-15',
    capacity: 25000,
  },
  {
    id: 2,
    plate: 'VRX-002',
    model: 'Volvo FM 400',
    type: 'Tractocamión',
    status: 'Disponible',
    driverId: null,
    fuelLevel: 60,
    mileage: 95000,
    lastMaintenance: '2024-01-20',
    capacity: 25000,
  },
  {
    id: 3,
    plate: 'VRX-003',
    model: 'Scania R 450',
    type: 'Tractocamión',
    status: 'En ruta',
    driverId: 3,
    fuelLevel: 72,
    mileage: 145000,
    lastMaintenance: '2023-12-10',
    capacity: 25000,
  },
];

export const mockDrivers = [
  {
    id: 1,
    name: 'Juan Rodríguez',
    email: 'juan.rodriguez@verdemex.com',
    phone: '+52 55 1234 5678',
    license: 'DL-12345',
    status: 'Activo',
    rating: 4.8,
    totalTrips: 145,
  },
  {
    id: 2,
    name: 'María García',
    email: 'maria.garcia@verdemex.com',
    phone: '+52 55 9876 5432',
    license: 'DL-54321',
    status: 'Activo',
    rating: 4.9,
    totalTrips: 192,
  },
  {
    id: 3,
    name: 'Carlos López',
    email: 'carlos.lopez@verdemex.com',
    phone: '+52 55 5555 5555',
    license: 'DL-99999',
    status: 'Activo',
    rating: 4.7,
    totalTrips: 156,
  },
];

export const mockOrders = [
  {
    id: 5001,
    orderNumber: 'ORD-2024-5001',
    origin: 'Ciudad de México',
    destination: 'Monterrey',
    status: 'En tránsito',
    weight: 15000,
    value: 45000,
    createdAt: '2024-03-01',
    estimatedDelivery: '2024-03-05',
  },
  {
    id: 5002,
    orderNumber: 'ORD-2024-5002',
    origin: 'Guadalajara',
    destination: 'Los Ángeles',
    status: 'Entregado',
    weight: 20000,
    value: 65000,
    createdAt: '2024-02-28',
    estimatedDelivery: '2024-03-04',
  },
  {
    id: 5003,
    orderNumber: 'ORD-2024-5003',
    origin: 'Querétaro',
    destination: 'México',
    status: 'Pendiente',
    weight: 10000,
    value: 30000,
    createdAt: '2024-03-02',
    estimatedDelivery: '2024-03-08',
  },
];

export const mockUsers = [
  {
    id: 1,
    name: 'Admin User',
    email: 'admin@verdemex.com',
    role: 'admin',
    status: 'Activo',
    createdAt: '2023-01-15',
  },
  {
    id: 2,
    name: 'Supervisor Fleet',
    email: 'supervisor@verdemex.com',
    role: 'supervisor',
    status: 'Activo',
    createdAt: '2023-06-20',
  },
];
