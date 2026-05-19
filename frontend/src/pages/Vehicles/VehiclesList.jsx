import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getVehicleIdentifier, getVehicleSecondaryLabel } from '../../utils/vehicleLabels';
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
  const [searchTerm, setSearchTerm] = useState('');
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
          throw new Error('Error al obtener vehiculos');
        }

        const data = await response.json();
        setVehicles(data.vehicles || []);
        setError(null);
      } catch (fetchError) {
        setError(fetchError.message);
        setVehicles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
  }, []);

  const filteredVehicles = vehicles.filter((vehicle) => {
    const matchesFilter = filter === 'todos'
      ? true
      : normalizeStatus(vehicle.estado) === filter;

    const normalizedQuery = searchTerm.trim().toLowerCase();
    const searchableText = [
      vehicle.numero_economico,
      vehicle.tipo_carro,
      vehicle.placa,
      vehicle.propietario_nombre,
      vehicle.marca,
      vehicle.modelo,
      vehicle.color,
      formatStatus(vehicle.estado)
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const matchesSearch = normalizedQuery ? searchableText.includes(normalizedQuery) : true;
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="vehicles-list">
      <div className="page-header">
        <div>
          <h1>Gestion de Vehiculos</h1>
          <p className="subtitle">Administra tu flotilla de transporte</p>
        </div>
        <Link to="/vehicles/create" className="btn btn-primary btn-lg">
          Anadir Vehiculo
        </Link>
      </div>

      <div className="card mb-3">
        <div className="card-body">
          <div className="vehicles-toolbar">
            <div className="filter-group">
              <label>Filtrar por estado:</label>
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

            <div className="vehicles-search">
              <label htmlFor="vehicles-search">Buscar vehiculo</label>
              <input
                id="vehicles-search"
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Numero economico, placa, tipo o propietario"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="loading-state">
              <p>Cargando vehiculos...</p>
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
                  <th>Numero Economico</th>
                  <th>Tipo</th>
                  <th>Placa</th>
                  <th>Propietario</th>
                  <th>Marca/Modelo</th>
                  <th>Color</th>
                  <th>Capacidad</th>
                  <th>Estado</th>
                  <th>Foto</th>
                  <th>Acciones</th>
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
                      <strong className="plate">{getVehicleIdentifier(vehicle)}</strong>
                    </td>
                    <td>{vehicle.tipo_carro || '-'}</td>
                    <td>{vehicle.placa || '-'}</td>
                    <td>{vehicle.propietario_nombre || '-'}</td>
                    <td>{vehicle.marca}/{vehicle.modelo}</td>
                    <td>
                      <span className="color-name">{vehicle.color || '-'}</span>
                    </td>
                    <td>{vehicle.capacidad_kg ? vehicle.capacidad_kg.toLocaleString() : '-'} kg</td>
                    <td>
                      <span className={`badge vehicle-status-badge ${getStatusBadgeClass(vehicle.estado)}`}>
                        <span>{formatStatus(vehicle.estado)}</span>
                      </span>
                    </td>
                    <td>
                      {vehicle.imagen_url ? (
                        <img
                          src={vehicle.imagen_url}
                          alt={getVehicleSecondaryLabel(vehicle)}
                          className="vehicle-thumbnail"
                        />
                      ) : (
                        <div className="vehicle-thumbnail vehicle-thumbnail-placeholder">
                          IMG
                        </div>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(`/vehicles/${vehicle.id}/edit`);
                        }}
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <p>
                {filter === 'todos' && !searchTerm.trim()
                  ? 'No hay vehiculos registrados'
                  : 'No se encontraron vehiculos con los filtros actuales'}
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
