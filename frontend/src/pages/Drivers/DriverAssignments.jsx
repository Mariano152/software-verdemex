import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { mockDrivers } from '../../data/mockData';
import './DriverAssignments.css';

const DriverAssignments = () => {
  const { id } = useParams();
  const driver = mockDrivers.find(v => v.id === id);
  const [filter, setFilter] = useState('active');

  if (!driver) {
    return (
      <div className="driver-assignments error">
        <div className="error-message">
          🚫 Conductor no encontrado
          <Link to="/drivers" className="btn">
            Volver a la lista
          </Link>
        </div>
      </div>
    );
  }

  // Mock assignments
  const allAssignments = [
    {
      id: 'ASG001',
      vehicleId: 'VH001',
      vehiclePlate: 'ABC-123',
      vehicleModel: 'Volvo FH16',
      startDate: '2024-01-15',
      endDate: null,
      status: 'Activo',
      mileage: 45230,
      tripCount: 12,
    },
    {
      id: 'ASG002',
      vehicleId: 'VH002',
      vehiclePlate: 'XYZ-789',
      vehicleModel: 'MAN TGX',
      startDate: '2023-11-01',
      endDate: '2024-01-14',
      status: 'Completado',
      mileage: 38500,
      tripCount: 9,
    },
    {
      id: 'ASG003',
      vehicleId: 'VH003',
      vehiclePlate: 'DEF-456',
      vehicleModel: 'Scania R450',
      startDate: '2023-08-20',
      endDate: '2023-10-31',
      status: 'Completado',
      mileage: 42100,
      tripCount: 15,
    },
  ];

  const activeAssignments = allAssignments.filter(a => a.status === 'Activo');
  const completedAssignments = allAssignments.filter(a => a.status === 'Completado');
  const displayedAssignments = filter === 'active' ? activeAssignments : completedAssignments;

  const getStatusColor = (status) => {
    switch (status) {
      case 'Activo':
        return '#2d7a3e';
      case 'Completado':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  return (
    <div className="driver-assignments">
      {/* HEADER */}
      <div className="page-header">
        <div className="header-content">
          <h1>Asignaciones de {driver.name}</h1>
          <p className="subtitle">Historial de vehículos asignados al conductor</p>
        </div>
        <Link to={`/drivers/${id}`} className="btn btn-secondary">
          ← Volver a Conductor
        </Link>
      </div>

      {/* STATS */}
      <div className="assignments-stats">
        <div className="stat-box">
          <span className="stat-label">Asignación Actual</span>
          <p className="stat-value">{activeAssignments.length > 0 ? activeAssignments[0].vehiclePlate : 'Sin asignar'}</p>
        </div>
        <div className="stat-box">
          <span className="stat-label">Viajes Totales</span>
          <p className="stat-value">{allAssignments.reduce((sum, a) => sum + a.tripCount, 0)}</p>
        </div>
        <div className="stat-box">
          <span className="stat-label">Km Acumulados</span>
          <p className="stat-value">{allAssignments.reduce((sum, a) => sum + a.mileage, 0).toLocaleString()}</p>
        </div>
        <div className="stat-box">
          <span className="stat-label">Asignaciones Completadas</span>
          <p className="stat-value">{completedAssignments.length}</p>
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="filter-tabs">
        <button
          className={`filter-btn ${filter === 'active' ? 'active' : ''}`}
          onClick={() => setFilter('active')}
        >
          🚗 Activas ({activeAssignments.length})
        </button>
        <button
          className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
          onClick={() => setFilter('completed')}
        >
          ✓ Completadas ({completedAssignments.length})
        </button>
      </div>

      {/* ASSIGNMENTS LIST */}
      <div className="assignments-container">
        {displayedAssignments.length > 0 ? (
          <div className="assignments-list">
            {displayedAssignments.map((assignment) => (
              <div key={assignment.id} className="assignment-card">
                <div className="assignment-header">
                  <div className="vehicle-info">
                    <h3>{assignment.vehicleModel}</h3>
                    <p className="plate">{assignment.vehiclePlate}</p>
                  </div>
                  <div className="status-header">
                    <span
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(assignment.status) }}
                    >
                      {assignment.status}
                    </span>
                  </div>
                </div>

                <div className="assignment-details">
                  <div className="detail-row">
                    <span className="label">Fecha de Inicio</span>
                    <span className="value">
                      📅 {new Date(assignment.startDate).toLocaleDateString('es-CO')}
                    </span>
                  </div>
                  {assignment.endDate && (
                    <div className="detail-row">
                      <span className="label">Fecha de Fin</span>
                      <span className="value">
                        📅 {new Date(assignment.endDate).toLocaleDateString('es-CO')}
                      </span>
                    </div>
                  )}
                  <div className="detail-row">
                    <span className="label">Duración</span>
                    <span className="value">
                      {(() => {
                        const start = new Date(assignment.startDate);
                        const end = assignment.endDate ? new Date(assignment.endDate) : new Date();
                        const days = Math.floor((end - start) / (1000 * 60 * 60 * 24));
                        return `${days} días`;
                      })()}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Viajes</span>
                    <span className="value">🛣️ {assignment.tripCount} viajes</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Kilómetros</span>
                    <span className="value">📍 {assignment.mileage.toLocaleString()} km</span>
                  </div>
                </div>

                <div className="assignment-actions">
                  <Link to={`/vehicles/${assignment.vehicleId}`} className="link-btn">
                    Ver Vehículo →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">🚗</div>
            <p>
              {filter === 'active'
                ? 'Sin asignaciones activas'
                : 'Sin asignaciones completadas'}
            </p>
          </div>
        )}
      </div>

      {/* TIMELINE VIEW */}
      {allAssignments.length > 0 && (
        <div className="timeline-section">
          <h2>Línea de Tiempo de Asignaciones</h2>
          <div className="timeline">
            {[...allAssignments]
              .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
              .map((assignment) => (
                <div key={assignment.id} className="timeline-item">
                  <div className="timeline-marker"></div>
                  <div className="timeline-content">
                    <div className="timeline-vehicle">{assignment.vehiclePlate}</div>
                    <div className="timeline-date">
                      {new Date(assignment.startDate).toLocaleDateString('es-CO')}
                      {assignment.endDate &&
                        ` – ${new Date(assignment.endDate).toLocaleDateString('es-CO')}`}
                    </div>
                    <div className="timeline-model">{assignment.vehicleModel}</div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverAssignments;
