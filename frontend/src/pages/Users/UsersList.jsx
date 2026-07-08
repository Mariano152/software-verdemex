import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchUsers } from './userApi';
import './UsersList.css';

const getRoleColor = (role) => {
  switch (role) {
    case 'admin':
      return '#dc2626';
    case 'conductor':
      return '#2d7a3e';
    default:
      return '#6b7280';
  }
};

export default function UsersList() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        const data = await fetchUsers();
        setUsers(data);
        setError(null);
      } catch (loadError) {
        setUsers([]);
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => (
    filter === 'all' ? users : users.filter((user) => user.role === filter)
  ), [users, filter]);

  const handleEdit = (userId) => {
    navigate(`/users/${userId}/edit`);
  };

  const handleView = (userId) => {
    navigate(`/users/${userId}/edit`);
  };

  return (
    <div className="users-page">
      <div className="user-header-card">
        <div>
          <h1>Gestion de Usuarios</h1>
          <p className="users-subtitle">Administra cuentas internas y cuentas de conductores</p>
        </div>
        <Link to="/users/create" className="btn btn-primary btn-lg">
          Nuevo Usuario
        </Link>
      </div>

      <div className="card mb-3">
        <div className="card-body">
          <div className="users-toolbar">
            <div className="user-filter">
              <label htmlFor="users-filter-role">Rol</label>
              <select
                id="users-filter-role"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              >
                <option value="all">Todos</option>
                <option value="admin">Admin</option>
                <option value="conductor">Conductor</option>
              </select>
            </div>

            <div className="users-toolbar-copy">
              <p className="results-copy">
                {filteredUsers.length} usuario{filteredUsers.length === 1 ? '' : 's'} visible{filteredUsers.length === 1 ? '' : 's'}
              </p>
              <p className="toolbar-hint">Haz clic en una fila o en Editar para abrir el usuario</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="user-empty">
              <p>Cargando usuarios...</p>
            </div>
          ) : error ? (
            <div className="user-empty">
              <p>Error: {error}</p>
            </div>
          ) : filteredUsers.length > 0 ? (
            <table className="user-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Username</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Conductor</th>
                  <th>Fecha de Registro</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="user-row"
                    onClick={() => handleEdit(user.id)}
                  >
                    <td>
                      <div className="user-name">{user.name || `${user.firstName} ${user.lastName}`}</div>
                      <div className="user-muted">
                        {user.driverName || `ID: ${user.id}`}
                      </div>
                    </td>
                    <td>@{user.username}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className="role-badge" style={{ backgroundColor: getRoleColor(user.role) }}>
                        {user.role}
                      </span>
                    </td>
                    <td>{user.driverName || 'Sin asignar'}</td>
                    <td>{new Date(user.createdAt).toLocaleDateString('es-MX')}</td>
                    <td>
                      <div className="user-actions">
                        <button
                          type="button"
                          className="btn btn-outline"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleView(user.id);
                          }}
                        >
                          Ver
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleEdit(user.id);
                          }}
                        >
                          Editar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="user-empty">
              <p>No se encontraron usuarios con el filtro actual.</p>
              <Link to="/users/create" className="btn btn-primary">
                Crear el primero
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
