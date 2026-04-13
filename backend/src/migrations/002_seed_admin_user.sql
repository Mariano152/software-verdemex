-- Agregar columna password si no existe
ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255);

-- Insertar usuario admin de prueba (solo en desarrollo)
-- Email: admin@verdemex.local
-- Contraseña: admin123
INSERT INTO users (email, first_name, last_name, password, created_at, updated_at)
VALUES (
  'admin@verdemex.local',
  'Admin',
  'Verdemex',
  '$2b$10$kRw5pV0qH.9CPWOk5zAXiurKBcDUubswkA42eu2aSphF8QQs5rFxW',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;
