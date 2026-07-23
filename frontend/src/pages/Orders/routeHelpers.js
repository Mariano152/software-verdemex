export const ROUTE_STATUS_OPTIONS = [
  { value: 'programada', label: 'Programada' },
  { value: 'en_proceso', label: 'En proceso' },
  { value: 'entregada', label: 'Entregada' },
  { value: 'cancelada', label: 'Cancelada' }
];

export const ROUTE_TYPE_OPTIONS = [
  { value: 'gondola', label: 'Gondola' },
  { value: 'trailer', label: 'Trailer' },
  { value: 'ambos', label: 'Ambos' }
];

export const createEmptyRouteForm = () => {
  const today = new Date().toISOString().slice(0, 10);

  return {
    conductor_id: '',
    vehiculo_id: '',
    origen: '',
    destino: '',
    kilometros_programados: '',
    metros_cubicos_enviados: '',
    tipo_unidad: 'gondola',
    fecha_registro: today,
    fecha_entrega: today,
    observaciones: '',
    descripcion: '',
    valor_monetario: '',
    estatus: 'programada'
  };
};

export const mapRouteToForm = (route) => ({
  conductor_id: route?.conductor_id || '',
  vehiculo_id: route?.vehiculo_id || '',
  origen: route?.origen || '',
  destino: route?.destino || '',
  kilometros_programados: route?.kilometros_programados ?? '',
  metros_cubicos_enviados: route?.metros_cubicos_enviados ?? '',
  tipo_unidad: route?.tipo_unidad || 'gondola',
  fecha_registro: route?.fecha_registro ? String(route.fecha_registro).slice(0, 10) : '',
  fecha_entrega: route?.fecha_entrega ? String(route.fecha_entrega).slice(0, 10) : '',
  observaciones: route?.observaciones || '',
  descripcion: route?.descripcion || '',
  valor_monetario: route?.valor_monetario ?? '',
  estatus: route?.estatus || 'programada'
});

export const buildRoutePayload = (formData) => ({
  ...formData,
  kilometros_programados: Number(formData.kilometros_programados || 0),
  metros_cubicos_enviados: Number(formData.metros_cubicos_enviados || 0),
  valor_monetario: Number(formData.valor_monetario || 0)
});

export const formatRouteStatus = (status) => (
  ROUTE_STATUS_OPTIONS.find((option) => option.value === status)?.label || status || 'Sin estatus'
);

export const formatRouteType = (type) => (
  ROUTE_TYPE_OPTIONS.find((option) => option.value === type)?.label || type || 'Sin tipo'
);

export const getRouteStatusColor = (status) => {
  switch (status) {
    case 'programada':
      return '#f59e0b';
    case 'en_proceso':
      return '#2d7a3e';
    case 'entregada':
      return '#10b981';
    case 'cancelada':
      return '#6b7280';
    default:
      return '#6b7280';
  }
};

export const getVehicleLabel = (vehicle) => {
  if (!vehicle) return 'Sin vehiculo';

  const parts = [
    vehicle.numero_economico,
    vehicle.placa,
    vehicle.tipo_carro
  ].filter(Boolean);

  return parts.join(' - ') || vehicle.id;
};

export const getRouteCode = (route) => (route?.id ? route.id.slice(0, 8).toUpperCase() : 'SIN-ID');
