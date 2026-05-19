const clean = (value) => String(value || '').trim();

export const getVehicleIdentifier = (vehicle) => (
  clean(vehicle?.numero_economico) || clean(vehicle?.placa) || 'Sin numero economico'
);

export const getVehicleSecondaryLabel = (vehicle) => (
  [clean(vehicle?.placa), clean(vehicle?.tipo_carro)]
    .filter(Boolean)
    .join(' - ') || 'Sin datos'
);

export const getVehicleDescriptionLabel = (vehicle) => (
  clean(vehicle?.descripcion) || clean(vehicle?.propietario_nombre) || 'Sin descripcion'
);

export const getVehicleSelectorLabel = (vehicle) => (
  [
    clean(vehicle?.numero_economico),
    clean(vehicle?.placa),
    clean(vehicle?.tipo_carro),
    getVehicleDescriptionLabel(vehicle)
  ]
    .filter(Boolean)
    .join(' - ')
);
