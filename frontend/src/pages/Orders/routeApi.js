const buildHeaders = () => {
  const token = localStorage.getItem('authToken');

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

const parseResponse = async (response, fallbackMessage) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || data.error || fallbackMessage);
  }

  return data;
};

export const fetchRoutes = async () => {
  const response = await fetch('/api/routes', {
    method: 'GET',
    headers: buildHeaders()
  });

  const data = await parseResponse(response, 'Error al obtener rutas');
  return data.routes || [];
};

export const fetchRouteById = async (routeId) => {
  const response = await fetch(`/api/routes/${routeId}`, {
    method: 'GET',
    headers: buildHeaders()
  });

  return parseResponse(response, 'Error al obtener ruta');
};

export const createRoute = async (payload) => {
  const response = await fetch('/api/routes', {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(payload)
  });

  const data = await parseResponse(response, 'Error al crear ruta');
  return data.route;
};

export const updateRoute = async (routeId, payload) => {
  const response = await fetch(`/api/routes/${routeId}`, {
    method: 'PUT',
    headers: buildHeaders(),
    body: JSON.stringify(payload)
  });

  const data = await parseResponse(response, 'Error al actualizar ruta');
  return data.route;
};

export const deleteRoute = async (routeId) => {
  const response = await fetch(`/api/routes/${routeId}`, {
    method: 'DELETE',
    headers: buildHeaders()
  });

  await parseResponse(response, 'Error al eliminar ruta');
};

export const fetchRouteDependencies = async () => {
  const [vehiclesResponse, driversResponse] = await Promise.all([
    fetch('/api/vehicles', {
      method: 'GET',
      headers: buildHeaders()
    }),
    fetch('/api/drivers', {
      method: 'GET',
      headers: buildHeaders()
    })
  ]);

  const vehiclesData = await parseResponse(vehiclesResponse, 'Error al obtener vehiculos');
  const driversData = await parseResponse(driversResponse, 'Error al obtener conductores');

  return {
    vehicles: vehiclesData.vehicles || [],
    drivers: driversData.drivers || []
  };
};
