# Ejecutar Migraciones

Si tienes errores al actualizar vehículos, es porque falta ejecutar la migración que agrega el campo `estado`.

## Opción 1: Desde Node.js (RECOMENDADO)

```bash
cd backend
npm run migrate
```

Si ese comando no existe, usa:

```bash
cd backend
node src/migrations/run.js
```

## Opción 2: Directamente en PostgreSQL (psql)

```sql
-- Conectar a tu BD Supabase
psql "postgresql://user:password@host:port/dbname"

-- Ejecutar los comandos de la migración:
ALTER TABLE IF EXISTS public.vehiculos
ADD COLUMN IF NOT EXISTS estado VARCHAR(50) DEFAULT 'activo';

ALTER TABLE public.vehiculos
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Agregar constraint
ALTER TABLE public.vehiculos
DROP CONSTRAINT IF EXISTS vehiculos_estado_check;

ALTER TABLE public.vehiculos
ADD CONSTRAINT vehiculos_estado_check 
CHECK (estado IN ('activo', 'inactivo', 'mantenimiento'));

-- Crear índice
CREATE INDEX IF NOT EXISTS idx_vehiculos_estado ON public.vehiculos(estado);
```

## Opción 3: Visual Studio Code + Supabase Extension

1. En VS Code: **Ctrl + Shift + P** → "Supabase: Run Query"
2. Pegn el SQL anterior
3. Ejecutar

---

**Después de ejecutar, recarga el frontend y vuelve a intentar la edición.**
