import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { mockDrivers } from '../../data/mockData';
import './DriversList.css';

export default function DriversList() {
  const [filter, setFilter] = useState('todos');
  const navigate = useNavigate();

  const filteredDrivers = filter === 'todos' 
    ? mockDrivers 
    : mockDrivers.filter(d => d.status === filter);

  const getRatingStars = (rating) => {
    return '⭐'.repeat(Math.floor(rating));
  };

  return (
    <div className="drivers-list">
      <div className="page-header">
        <div>
          <h1>Gestión de Conductores</h1>
          <p className="subtitle">Administra tu equipo de conductores</p>
        </div>
        <Link to="/drivers/create" className="btn btn-primary btn-lg">
          ➕ Añadir Conductor
        </Link>
      </div>

      {/* Filtros */}
      <div className="card mb-3">
        <div className="card-body">
          <div className="filter-group">
            <label>Filtrar por Estado:</label>
            <div className="filter-buttons">
              {['todos', 'Activo', 'Vacaciones', 'Inactivo'].map((status) => (
                <button
                  key={status}
                  className={`filter-btn ${filter === status ? 'active' : ''}`}
                  onClick={() => setFilter(status)}
                >
                  {status === 'todos' ? '📊 Todos' : status}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de conductores */}
      <div className="card">
        <div className="card-body">
          {filteredDrivers.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Teléfono</th>
                  <th>Estado</th>
                  <th>Calificación</th>
                  <th>Viajes</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredDrivers.map((driver) => (
                  <tr key={driver.id}>
                    <td>
                      <strong>{driver.name}</strong>
                    </td>
                    <td>{driver.email}</td>
                    <td>{driver.phone}</td>
                    <td>
                      <span className={`badge badge-${driver.status === 'Activo' ? 'success' : 'warning'}`}>
                        {driver.status}
                      </span>
                    </td>
                    <td>
                      <div className="rating">
                        <span className="stars">{getRatingStars(driver.rating)}</span>
                        <span className="rating-value">{driver.rating}</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-info">{driver.totalTrips}</span>
                    </td>
                    <td className="actions-cell">
                      <button
                        className="btn-icon"
                        title="Ver detalles"
                        onClick={() => navigate(`/drivers/${driver.id}`)}
                      >
                        👁️
                      </button>
                      <button
                        className="btn-icon"
                        title="Editar"
                        onClick={() => navigate(`/drivers/${driver.id}/edit`)}
                      >
                        ✏️
                      </button>
                      <button
                        className="btn-icon"
                        title="Asignaciones"
                        onClick={() => navigate(`/drivers/${driver.id}/assignments`)}
                      >
                        📋
                      </button>
                      <button
                        className="btn-icon"
                        title="Calificaciones"
                        onClick={() => navigate(`/drivers/${driver.id}/ratings`)}
                      >
                        ⭐
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <p>No hay conductores que coincidan con el filtro seleccionado</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
