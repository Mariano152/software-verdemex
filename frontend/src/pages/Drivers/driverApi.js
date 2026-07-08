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
    throw new Error(data.message || fallbackMessage);
  }

  return data;
};

const buildDriverFormData = (payload = {}) => {
  const formData = new FormData();

  Object.entries(payload).forEach(([key, value]) => {
    if (key === 'imagen') {
      if (value instanceof File) {
        formData.append(key, value);
      }
      return;
    }

    if (value === undefined || value === null) {
      formData.append(key, '');
      return;
    }

    if (key !== 'imagenPreview') {
      formData.append(key, value);
    }
  });

  return formData;
};

export const fetchDrivers = async () => {
  const response = await fetch('/api/drivers', {
    method: 'GET',
    headers: buildHeaders()
  });

  const data = await parseResponse(response, 'Error al obtener conductores');
  return data.drivers || [];
};

export const fetchDriverById = async (driverId) => {
  const response = await fetch(`/api/drivers/${driverId}`, {
    method: 'GET',
    headers: buildHeaders()
  });

  return parseResponse(response, 'Error al obtener conductor');
};

export const createDriver = async (payload) => {
  const response = await fetch('/api/drivers', {
    method: 'POST',
    headers: {
      Authorization: buildHeaders().Authorization
    },
    body: buildDriverFormData(payload)
  });

  const data = await parseResponse(response, 'Error al crear conductor');
  return data.driver;
};

export const updateDriver = async (driverId, payload) => {
  const response = await fetch(`/api/drivers/${driverId}`, {
    method: 'PUT',
    headers: {
      Authorization: buildHeaders().Authorization
    },
    body: buildDriverFormData(payload)
  });

  const data = await parseResponse(response, 'Error al actualizar conductor');
  return data.driver;
};

export const createEmergencyContact = async (driverId, payload) => {
  const response = await fetch(`/api/drivers/${driverId}/emergency-contacts`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(payload)
  });

  const data = await parseResponse(response, 'Error al crear contacto de emergencia');
  return data.contact;
};

export const updateEmergencyContact = async (driverId, contactId, payload) => {
  const response = await fetch(`/api/drivers/${driverId}/emergency-contacts/${contactId}`, {
    method: 'PUT',
    headers: buildHeaders(),
    body: JSON.stringify(payload)
  });

  const data = await parseResponse(response, 'Error al actualizar contacto de emergencia');
  return data.contact;
};

export const deleteEmergencyContact = async (driverId, contactId) => {
  const response = await fetch(`/api/drivers/${driverId}/emergency-contacts/${contactId}`, {
    method: 'DELETE',
    headers: buildHeaders()
  });

  await parseResponse(response, 'Error al eliminar contacto de emergencia');
};

export const createDriverDocument = async (driverId, payload, files = []) => {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    formData.append(key, value ?? '');
  });
  files.forEach((file) => formData.append('documento', file));

  const response = await fetch(`/api/drivers/${driverId}/documents`, {
    method: 'POST',
    headers: {
      Authorization: buildHeaders().Authorization
    },
    body: formData
  });

  const data = await parseResponse(response, 'Error al crear documento');
  return data.document;
};

export const updateDriverDocument = async (driverId, documentId, payload, files = []) => {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    formData.append(key, value ?? '');
  });
  files.forEach((file) => formData.append('documento', file));

  const response = await fetch(`/api/drivers/${driverId}/documents/${documentId}`, {
    method: 'PUT',
    headers: {
      Authorization: buildHeaders().Authorization
    },
    body: formData
  });

  const data = await parseResponse(response, 'Error al actualizar documento');
  return data.document;
};

export const deleteDriverDocument = async (driverId, documentId) => {
  const response = await fetch(`/api/drivers/${driverId}/documents/${documentId}`, {
    method: 'DELETE',
    headers: buildHeaders()
  });

  await parseResponse(response, 'Error al eliminar documento');
};

export const createDriverHistory = async (driverId, payload, files = []) => {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    formData.append(key, value ?? '');
  });
  files.forEach((file) => formData.append('documento', file));

  const response = await fetch(`/api/drivers/${driverId}/history`, {
    method: 'POST',
    headers: {
      Authorization: buildHeaders().Authorization
    },
    body: formData
  });

  const data = await parseResponse(response, 'Error al crear historial');
  return data.history;
};

export const updateDriverHistory = async (driverId, historyId, payload, files = []) => {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    formData.append(key, value ?? '');
  });
  files.forEach((file) => formData.append('documento', file));

  const response = await fetch(`/api/drivers/${driverId}/history/${historyId}`, {
    method: 'PUT',
    headers: {
      Authorization: buildHeaders().Authorization
    },
    body: formData
  });

  const data = await parseResponse(response, 'Error al actualizar historial');
  return data.history;
};

export const deleteDriverHistory = async (driverId, historyId) => {
  const response = await fetch(`/api/drivers/${driverId}/history/${historyId}`, {
    method: 'DELETE',
    headers: buildHeaders()
  });

  await parseResponse(response, 'Error al eliminar historial');
};

export const createDriverRating = async (driverId, payload, files = []) => {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    formData.append(key, value ?? '');
  });
  files.forEach((file) => formData.append('documento', file));

  const response = await fetch(`/api/drivers/${driverId}/ratings`, {
    method: 'POST',
    headers: {
      Authorization: buildHeaders().Authorization
    },
    body: formData
  });

  const data = await parseResponse(response, 'Error al crear rating');
  return data.rating;
};

export const updateDriverRating = async (driverId, ratingId, payload, files = []) => {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    formData.append(key, value ?? '');
  });
  files.forEach((file) => formData.append('documento', file));

  const response = await fetch(`/api/drivers/${driverId}/ratings/${ratingId}`, {
    method: 'PUT',
    headers: {
      Authorization: buildHeaders().Authorization
    },
    body: formData
  });

  const data = await parseResponse(response, 'Error al actualizar rating');
  return data.rating;
};

export const deleteDriverRating = async (driverId, ratingId) => {
  const response = await fetch(`/api/drivers/${driverId}/ratings/${ratingId}`, {
    method: 'DELETE',
    headers: buildHeaders()
  });

  await parseResponse(response, 'Error al eliminar rating');
};
