-- USUARIOS
CREATE TABLE IF NOT EXISTS public.users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL
);

-- VEHÍCULOS (para RF2)
CREATE TABLE IF NOT EXISTS public.vehicles (
  id SERIAL PRIMARY KEY,
  plate VARCHAR(20) UNIQUE NOT NULL,
  model VARCHAR(100),
  type VARCHAR(50),
  status VARCHAR(50) DEFAULT 'Disponible',
  fuel_level INT DEFAULT 100,
  mileage INT DEFAULT 0,
  capacity INT,
  image_url VARCHAR(500),
  qr_code_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL
);

-- CONDUCTORES (para RF5)
CREATE TABLE IF NOT EXISTS public.drivers (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES public.users(id),
  license_number VARCHAR(50) UNIQUE NOT NULL,
  license_expiry DATE,
  rating DECIMAL(3,2) DEFAULT 0.00,
  total_ratings INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL
);

-- ÓRDENES (para RF7)
CREATE TABLE IF NOT EXISTS public.orders (
  id SERIAL PRIMARY KEY,
  vehicle_id INT REFERENCES public.vehicles(id),
  driver_id INT REFERENCES public.drivers(id),
  status VARCHAR(50) DEFAULT 'pending',
  origin VARCHAR(255),
  destination VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL
);

-- ÍNDICES para performance
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON public.vehicles(status);
CREATE INDEX IF NOT EXISTS idx_drivers_license ON public.drivers(license_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
