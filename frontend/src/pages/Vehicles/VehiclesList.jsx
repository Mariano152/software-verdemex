import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './VehiclesList.css';

export default function VehiclesList() {
  const [vehicles, setVehicles] = useState([]);
  const [filter, setFilter] = useState('todos');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Cargar vehículos desde API
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('authToken');
        
        const response = await fetch('http://localhost:3000/api/vehicles', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
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
    : vehicles.filter(v => v.estado === filter);

  const getStatusBadgeClass = (status) => {
    switch(status) {
      case 'activo': return 'badge-success';
      case 'mantenimiento': return 'badge-warning';
      case 'inactivo': return 'badge-danger';
      default: return 'badge-primary';
    }
  };

  const formatStatus = (status) => {
    const statusMap = {
      'activo': '✓ Activo',
      'mantenimiento': '🔧 Mantenimiento',
      'inactivo': '🚫 Inactivo'
    };
    return statusMap[status] || status;
  };

  return (
    <div className="vehicles-list">
      <div className="page-header">
        <div>
          <h1>Gestión de Vehículos</h1>
          <p className="subtitle">Administra tu flotilla de transporte</p>
        </div>
        <Link to="/vehicles/create" className="btn btn-primary btn-lg">
          ➕ Añadir Vehículo
        </Link>
      </div>

      {/* Filtros */}
      <div className="card mb-3">
        <div className="card-body">
          <div className="filter-group">
            <label>Filtrar por Estado:</label>
            <div className="filter-buttons">
              {['todos', 'activo', 'mantenimiento', 'inactivo'].map((status) => (
                <button
                  key={status}
                  className={`filter-btn ${filter === status ? 'active' : ''}`}
                  onClick={() => setFilter(status)}
                >
                  {status === 'todos' ? '📊 Todos' : formatStatus(status)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de vehículos */}
      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="loading-state">
              <p>⏳ Cargando vehículos...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <p>❌ Error: {error}</p>
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
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.map((vehicle) => (
                  <tr key={vehicle.id}>
                    <td>
                      <strong className="plate">{vehicle.placa}</strong>
                    </td>
                    <td>{vehicle.propietario_nombre}</td>
                    <td>{vehicle.marca}/{vehicle.modelo}</td>
                    <td>{vehicle.modelo}</td>
                    <td>
                      <span className="color-badge" style={{backgroundColor: vehicle.color || '#ccc'}}>
                        {vehicle.color || '-'}
                      </span>
                    </td>
                    <td>{vehicle.capacidad_kg ? vehicle.capacidad_kg.toLocaleString() : '-'} kg</td>
                    <td>
                      <span className={`badge ${getStatusBadgeClass(vehicle.estado)}`}>
                        {formatStatus(vehicle.estado)}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <button
                        className="btn-icon"
                        title="Ver detalles"
                        onClick={() => navigate(`/vehicles/${vehicle.id}`)}
                      >
                        👁️
                      </button>
                      <button
                        className="btn-icon"
                        title="Editar"
                        onClick={() => navigate(`/vehicles/${vehicle.id}/edit`)}
                      >
                        ✏️
                      </button>
                      <button
                        className="btn-icon"
                        title="Documentos"
                        onClick={() => navigate(`/vehicles/${vehicle.id}/documents`)}
                      >
                        📋
                      </button>
                      <button
                        className="btn-icon"
                        title="Fotos"
                        onClick={() => navigate(`/vehicles/${vehicle.id}/photos`)}
                      >
                        📸
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <p>🚗 No hay vehículos registrados</p>
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
