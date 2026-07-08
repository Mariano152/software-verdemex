-- ===================================================================
-- MIGRACION: ROLES Y USUARIOS DE CONDUCTOR
-- ===================================================================
-- Fecha: 2026-07-07
-- Descripcion: Agrega username, role y vinculacion opcional entre
--              users y conductores para soportar cuentas admin y
--              conductor sin borrar informacion existente.
-- ===================================================================

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS username VARCHAR(80);

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS role VARCHAR(20);

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS driver_id UUID NULL REFERENCES public.conductores(id) ON DELETE SET NULL;

UPDATE public.users
SET username = LOWER(
  REGEXP_REPLACE(
    COALESCE(SPLIT_PART(email, '@', 1), 'usuario_' || id::text),
    '[^a-zA-Z0-9_]+',
    '_',
    'g'
  )
)
WHERE username IS NULL;

UPDATE public.users
SET role = CASE
  WHEN email = 'admin@verdemex.local' THEN 'admin'
  ELSE 'operador'
END
WHERE role IS NULL;

ALTER TABLE public.users
ALTER COLUMN username SET NOT NULL;

ALTER TABLE public.users
ALTER COLUMN role SET NOT NULL;

ALTER TABLE public.users
DROP CONSTRAINT IF EXISTS chk_users_role;

ALTER TABLE public.users
ADD CONSTRAINT chk_users_role
CHECK (role IN ('admin', 'operador', 'conductor'));

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_username
  ON public.users(LOWER(username))
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_driver_id
  ON public.users(driver_id)
  WHERE driver_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_role
  ON public.users(role)
  WHERE deleted_at IS NULL;
