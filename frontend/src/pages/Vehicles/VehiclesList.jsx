import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './VehiclesList.css';

const FILTER_OPTIONS = ['todos', 'activo', 'mantenimiento', 'inactivo'];

const normalizeStatus = (status) => {
  const normalizedStatus = String(status || '').trim().toLowerCase();

  if (normalizedStatus === 'en_mantenimiento') {
    return 'mantenimiento';
  }

  return normalizedStatus || 'desconocido';
};

const getStatusBadgeClass = (status) => {
  switch (normalizeStatus(status)) {
    case 'activo':
      return 'badge-success';
    case 'mantenimiento':
      return 'badge-warning';
    case 'inactivo':
      return 'badge-danger';
    default:
      return 'badge-primary';
  }
};

const getStatusIcon = (status) => {
  switch (normalizeStatus(status)) {
    case 'activo':
      return '✓';
    case 'mantenimiento':
      return '🔧';
    case 'inactivo':
      return '🚫';
    default:
      return '•';
  }
};

const formatStatus = (status) => {
  const normalizedStatus = normalizeStatus(status);
  const statusMap = {
    activo: 'Activo',
    mantenimiento: 'Mantenimiento',
    inactivo: 'Inactivo',
    desconocido: 'Sin estado'
  };

  return statusMap[normalizedStatus] || status || 'Sin estado';
};

export default function VehiclesList() {
  const [vehicles, setVehicles] = useState([]);
  const [filter, setFilter] = useState('todos');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('authToken');

        const response = await fetch('/api/vehicles', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Error al obtener vehículos');
        }

        const data = await response.json();
        setVehicles(data.vehicles || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching vehicles:', err);
        setError(err.message);
        setVehicles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
  }, []);

  const filteredVehicles = filter === 'todos'
    ? vehicles
    : vehicles.filter((vehicle) => normalizeStatus(vehicle.estado) === filter);

  return (
    <div className="vehicles-list">
      <div className="page-header">
        <div>
          <h1>Gestión de Vehículos</h1>
          <p className="subtitle">Administra tu flotilla de transporte</p>
        </div>
        <Link to="/vehicles/create" className="btn btn-primary btn-lg">
          Añadir Vehículo
        </Link>
      </div>

      <div className="card mb-3">
        <div className="card-body">
          <div className="filter-group">
            <label>Filtrar por Estado:</label>
            <div className="filter-buttons">
              {FILTER_OPTIONS.map((status) => (
                <button
                  type="button"
                  key={status}
                  className={`filter-btn ${filter === status ? 'active' : ''}`}
                  onClick={() => setFilter(status)}
                >
                  {status === 'todos' ? 'Todos' : formatStatus(status)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="loading-state">
              <p>Cargando vehículos...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <p>Error: {error}</p>
              <button onClick={() => window.location.reload()} className="btn btn-secondary">
                Reintentar
              </button>
            </div>
          ) : filteredVehicles.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Placa</th>
                  <th>Propietario</th>
                  <th>Marca/Modelo</th>
                  <th>Año</th>
                  <th>Color</th>
                  <th>Capacidad</th>
                  <th>Estado</th>
                  <th>Foto</th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.map((vehicle) => (
                  <tr
                    key={vehicle.id}
                    className="clickable-row"
                    onClick={() => navigate(`/vehicles/${vehicle.id}/edit`)}
                  >
                    <td>
                      <strong className="plate">{vehicle.placa}</strong>
                    </td>
                    <td>{vehicle.propietario_nombre}</td>
                    <td>{vehicle.marca}/{vehicle.modelo}</td>
                    <td>{vehicle.modelo}</td>
                    <td>
                      <span
                        className="color-badge"
                        style={{ backgroundColor: vehicle.color || '#ccc' }}
                        title={vehicle.color || 'Sin color'}
                        aria-label={vehicle.color || 'Sin color'}
                      />
                      <span className="color-name">{vehicle.color || '-'}</span>
                    </td>
                    <td>{vehicle.capacidad_kg ? vehicle.capacidad_kg.toLocaleString() : '-'} kg</td>
                    <td>
                      <span className={`badge vehicle-status-badge ${getStatusBadgeClass(vehicle.estado)}`}>
                        <span className="vehicle-status-icon" aria-hidden="true">
                          {getStatusIcon(vehicle.estado)}
                        </span>
                        <span>{formatStatus(vehicle.estado)}</span>
                      </span>
                    </td>
                    <td>
                      {vehicle.imagen_url ? (
                        <img
                          src={vehicle.imagen_url}
                          alt={vehicle.placa}
                          className="vehicle-thumbnail"
                        />
                      ) : (
                        <div className="vehicle-thumbnail vehicle-thumbnail-placeholder">
                          📷
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <p>
                {filter === 'todos'
                  ? 'No hay vehículos registrados'
                  : `No hay vehículos con estado "${formatStatus(filter)}"`}
              </p>
              <Link to="/vehicles/create" className="btn btn-primary">
                Crear el primero
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
