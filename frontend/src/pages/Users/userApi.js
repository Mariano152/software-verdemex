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

export const fetchUsers = async () => {
  const response = await fetch('/api/users', {
    method: 'GET',
    headers: buildHeaders()
  });

  const data = await parseResponse(response, 'Error al obtener usuarios');
  return data.users || [];
};

export const fetchUserById = async (userId) => {
  const response = await fetch(`/api/users/${userId}`, {
    method: 'GET',
    headers: buildHeaders()
  });

  const data = await parseResponse(response, 'Error al obtener usuario');
  return data.user;
};

export const createUser = async (payload) => {
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(payload)
  });

  const data = await parseResponse(response, 'Error al crear usuario');
  return data.user;
};

export const updateUser = async (userId, payload) => {
  const response = await fetch(`/api/users/${userId}`, {
    method: 'PUT',
    headers: buildHeaders(),
    body: JSON.stringify(payload)
  });

  const data = await parseResponse(response, 'Error al actualizar usuario');
  return data.user;
};
