import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './UsersList.css';

const UsersList = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');

  const users = [
    {
      id: 'U001',
      name: 'Carlos González',
      email: 'carlos@verdemex.com',
      role: 'Admin',
      status: 'Activo',
      joinDate: '2023-06-15',
    },
    {
      id: 'U002',
      name: 'María López',
      email: 'maria@verdemex.com',
      role: 'Manager',
      status: 'Activo',
      joinDate: '2023-08-20',
    },
    {
      id: 'U003',
      name: 'Juan Pérez',
      email: 'juan@verdemex.com',
      role: 'Operador',
      status: 'Activo',
      joinDate: '2023-09-10',
    },
  ];

  const filteredUsers = filter === 'all' ? users : users.filter(u => u.role === filter);

  const getRoleColor = (role) => {
    switch (role) {
      case 'Admin':
        return '#dc2626';
      case 'Manager':
        return '#f59e0b';
      case 'Operador':
        return '#2d7a3e';
      default:
        return '#6b7280';
    }
  };

  return (
    <div className="users-list">
      {/* HEADER */}
      <div className="page-header">
        <div className="header-content">
          <h1>👥 Gestión de Usuarios</h1>
          <p className="subtitle">Administra los usuarios del sistema</p>
        </div>
        <Link to="/users/create" className="btn btn-primary btn-lg">
          ➕ Nuevo Usuario
        </Link>
      </div>

      {/* FILTERS */}
      <div className="filter-section">
        <label>Filtrar por Rol:</label>
        <div className="filter-buttons">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            Todos ({users.length})
          </button>
          {['Admin', 'Manager', 'Operador'].map(role => (
            <button
              key={role}
              className={`filter-btn ${filter === role ? 'active' : ''}`}
              onClick={() => setFilter(role)}
            >
              {role} ({users.filter(u => u.role === role).length})
            </button>
          ))}
        </div>
      </div>

      {/* TABLE */}
      <div className="table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Fecha de Registro</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id}>
                <td><strong>{user.name}</strong></td>
                <td>{user.email}</td>
                <td>
                  <span className="role-badge" style={{backgroundColor: getRoleColor(user.role)}}>
                    {user.role}
                  </span>
                </td>
                <td>
                  <span className="status-badge active">{user.status}</span>
                </td>
                <td>{new Date(user.joinDate).toLocaleDateString('es-CO')}</td>
                <td className="actions-cell">
                  <button
                    className="btn-icon"
                    title="Ver perfil"
                    onClick={() => navigate(`/users/${user.id}`)}
                  >
                    👁️
                  </button>
                  <button
                    className="btn-icon"
                    title="Editar"
                    onClick={() => navigate(`/users/${user.id}/edit`)}
                  >
                    ✏️
                  </button>
                  <button
                    className="btn-icon"
                    title="Eliminar"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UsersList;
