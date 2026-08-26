ALTER TABLE public.vehiculos
DROP CONSTRAINT IF EXISTS vehiculos_tipo_carro_check;

ALTER TABLE public.vehiculos
ADD CONSTRAINT vehiculos_tipo_carro_check
CHECK (
  tipo_carro IS NULL
  OR tipo_carro IN (
    'Torton',
    'Tracto',
    'Remolque',
    'Rabon',
    'Pipa',
    'Gondola',
    'Plataforma',
    'Roll Off',
    'Vacuum',
    'Tanque Diesel',
    'Contenedor',
    'Maquinaria'
  )
);
