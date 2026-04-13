import { useParams, Link, useNavigate } from 'react-router-dom';
import { mockVehicles } from '../../data/mockData';
import './VehicleDetail.css';

export default function VehicleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const vehicle = mockVehicles.find(v => v.id === parseInt(id));

  if (!vehicle) {
    return (
      <div className="vehicle-detail">
        <div className="alert alert-danger">
          Vehículo no encontrado
        </div>
        <Link to="/vehicles" className="btn btn-primary">
          Volver a Vehículos
        </Link>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch(status) {
      case 'En ruta': return '#27ae60';
      case 'Disponible': return '#3498db';
      case 'Mantenimiento': return '#f39c12';
      case 'Inactivo': return '#e74c3c';
      default: return '#2d7a3e';
    }
  };

  return (
    <div className="vehicle-detail">
      <div className="detail-header">
        <Link to="/vehicles" className="btn btn-outline">← Volver</Link>
      </div>

      {/* Tarjeta Principal */}
      <div className="card">
        <div className="detail-hero">
          <div className="hero-content">
            <h1>{vehicle.plate}</h1>
            <p className="model-name">{vehicle.model}</p>
            <span className="badge" style={{ backgroundColor: getStatusColor(vehicle.status) + '33', color: getStatusColor(vehicle.status) }}>
              {vehicle.status}
            </span>
          </div>
          <div className="hero-actions">
            <button 
              className="btn btn-secondary"
              onClick={() => navigate(`/vehicles/${id}/edit`)}
            >
              ✏️ Editar
            </button>
            <button 
              className="btn btn-outline"
              onClick={() => navigate(`/vehicles/${id}/history`)}
            >
              📋 Historial
            </button>
          </div>
        </div>
      </div>

      {/* Grid de información */}
      <div className="detail-grid">
        {/* Información General */}
        <div className="card">
          <div className="card-header">Información General</div>
          <div className="detail-items">
            <div className="detail-item">
              <span className="label">Placa</span>
              <span className="value">{vehicle.plate}</span>
            </div>
            <div className="detail-item">
              <span className="label">Modelo</span>
              <span className="value">{vehicle.model}</span>
            </div>
            <div className="detail-item">
              <span className="label">Tipo</span>
              <span className="value">{vehicle.type}</span>
            </div>
            <div className="detail-item">
              <span className="label">Estado</span>
              <span className="value">
                <span className="badge" style={{ backgroundColor: getStatusColor(vehicle.status) + '33', color: getStatusColor(vehicle.status) }}>
                  {vehicle.status}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Especificaciones Técnicas */}
        <div className="card">
          <div className="card-header">Especificaciones Técnicas</div>
          <div className="detail-items">
            <div className="detail-item">
              <span className="label">Capacidad</span>
              <span className="value">{vehicle.capacity.toLocaleString()} kg</span>
            </div>
            <div className="detail-item">
              <span className="label">Kilometraje</span>
              <span className="value">{vehicle.mileage.toLocaleString()} km</span>
            </div>
            <div className="detail-item">
              <span className="label">Combustible</span>
              <span className="value">{vehicle.fuelLevel}%</span>
            </div>
            <div className="detail-item">
              <span className="label">Último Mantenimiento</span>
              <span className="value">{new Date(vehicle.lastMaintenance).toLocaleDateString('es-MX')}</span>
            </div>
          </div>
        </div>

        {/* Conductor Asignado */}
        <div className="card">
          <div className="card-header">Conductor Asignado</div>
          <div className="detail-items">
            {vehicle.driverId ? (
              <>
                <div className="detail-item">
                  <span className="label">ID Conductor</span>
                  <span className="value">#{vehicle.driverId}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Acción</span>
                  <button 
                    className="btn btn-sm btn-outline"
                    onClick={() => navigate(`/drivers/${vehicle.driverId}`)}
                  >
                    Ver Conductor
                  </button>
                </div>
              </>
            ) : (
              <p className="text-muted">Sin conductor asignado</p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs de información adicional */}
      <div className="card">
        <div className="card-header">Opciones Adicionales</div>
        <div className="detail-options">
          <button 
            className="option-btn"
            onClick={() => navigate(`/vehicles/${id}/file`)}
          >
            <span className="option-icon">📁</span>
            <span className="option-text">Expediente</span>
          </button>
          <button 
            className="option-btn"
            onClick={() => navigate(`/vehicles/${id}/event`)}
          >
            <span className="option-icon">⚙️</span>
            <span className="option-text">Nuevo Evento</span>
          </button>
          <button 
            className="option-btn"
            onClick={() => navigate(`/vehicles/${id}/history`)}
          >
            <span className="option-icon">📋</span>
            <span className="option-text">Historial de Estado</span>
          </button>
          <button 
            className="option-btn"
            onClick={() => navigate(`/vehicles/${id}/qr`)}
          >
            <span className="option-icon">📱</span>
            <span className="option-text">Código QR</span>
          </button>
        </div>
      </div>
    </div>
  );
}
