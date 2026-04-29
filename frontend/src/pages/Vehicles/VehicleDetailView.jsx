import { useState } from 'react';
import ExpedienteSection from './Sections/ExpedienteSection';
import './VehicleDetailView.css';

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

/**
 * VehicleDetailView - Vista profesional de detalles del vehiculo
 * Muestra:
 * 1. Informacion basica (izquierda) + Expedientes (derecha)
 * 2. 4 cards de modulos (Documentos, Mantenimiento, Gasolina, Fotografias)
 */
export default function VehicleDetailView({
  vehicle,
  vehicleId,
  onDocumentsClick,
  onMaintenanceClick,
  onGasolineClick,
  onPhotosClick
}) {
  const [activeSection, setActiveSection] = useState(null);

  const handleModuleClick = (module) => {
    setActiveSection(module);
    if (module === 'documents') onDocumentsClick?.();
    else if (module === 'maintenance') onMaintenanceClick?.();
    else if (module === 'gasoline') onGasolineClick?.();
    else if (module === 'photos') onPhotosClick?.();
  };

  return (
    <div className="vehicle-detail-view">
      <div className="detail-main-layout">
        <div className="detail-left-column">
          <div className="info-section">
            <h2 className="info-title">
              <span className="icon">ℹ️</span>
              Informacion Basica del Vehiculo
            </h2>

            <div className="table-wrapper">
              <table className="info-table">
                <tbody>
                  <tr>
                    <td className="label">Propietario</td>
                    <td className="value">{vehicle.propietario_nombre}</td>
                  </tr>
                  <tr>
                    <td className="label">Placa</td>
                    <td className="value">
                      <span className="plate-badge">{vehicle.placa}</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="label">Numero de Serie</td>
                    <td className="value font-mono">{vehicle.numero_serie}</td>
                  </tr>
                  <tr>
                    <td className="label">Marca</td>
                    <td className="value">{vehicle.marca}</td>
                  </tr>
                  <tr>
                    <td className="label">Modelo (Ano)</td>
                    <td className="value">{vehicle.modelo}</td>
                  </tr>
                  <tr>
                    <td className="label">Color</td>
                    <td className="value">
                      <span className="color-name">{vehicle.color || '-'}</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="label">Capacidad</td>
                    <td className="value">
                      {vehicle.capacidad_kg ? `${vehicle.capacidad_kg.toLocaleString()} kg` : '-'}
                    </td>
                  </tr>
                  <tr>
                    <td className="label">Estado</td>
                    <td className="value">
                      <span className={`status-badge ${getStatusBadgeClass(vehicle.estado)}`}>
                        <span className="status-icon" aria-hidden="true">
                          {getStatusIcon(vehicle.estado)}
                        </span>
                        <span>{formatStatus(vehicle.estado)}</span>
                      </span>
                    </td>
                  </tr>
                  {vehicle.descripcion && (
                    <tr>
                      <td className="label">Descripcion</td>
                      <td className="value description">{vehicle.descripcion}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {vehicleId && (
          <div className="detail-right-column">
            <ExpedienteSection vehicleId={vehicleId} />
          </div>
        )}
      </div>

      <div className="modules-section">
        <h2 className="modules-title">
          <span className="icon">📋</span>
          Modulos de Informacion
        </h2>

        <div className="modules-grid">
          <div
            className="module-card documents"
            onClick={() => handleModuleClick('documents')}
            data-active={activeSection === 'documents'}
          >
            <div className="module-header">
              <span className="module-icon">📄</span>
              <span>Documentos</span>
            </div>
            <div className="module-info">
              Permisos, licencias y documentos del vehiculo
            </div>
            <div className="module-stats">
              {vehicle.documents?.length || 0} documentos registrados
            </div>
            <button className="module-button">
              Ver Detalles
            </button>
          </div>

          <div
            className="module-card maintenance"
            onClick={() => handleModuleClick('maintenance')}
            data-active={activeSection === 'maintenance'}
          >
            <div className="module-header">
              <span className="module-icon">🔧</span>
              <span>Mantenimiento</span>
            </div>
            <div className="module-info">
              Elementos de seguridad y mantenimiento
            </div>
            <div className="module-stats">
              {vehicle.safetyElements?.length || 0}/11 elementos completados
            </div>
            <button className="module-button">
              Ver Detalles
            </button>
          </div>

          <div
            className="module-card gasoline"
            onClick={() => handleModuleClick('gasoline')}
            data-active={activeSection === 'gasoline'}
          >
            <div className="module-header">
              <span className="module-icon">⛽</span>
              <span>Gasolina</span>
            </div>
            <div className="module-info">
              Historial de cargas, litros comprados y gasto mensual
            </div>
            <div className="module-stats">
              {vehicle.gasolineRecords?.length || 0} cargas registradas
            </div>
            <button className="module-button">
              Ver Detalles
            </button>
          </div>

          <div
            className="module-card photos"
            onClick={() => handleModuleClick('photos')}
            data-active={activeSection === 'photos'}
          >
            <div className="module-header">
              <span className="module-icon">📸</span>
              <span>Fotografias</span>
            </div>
            <div className="module-info">
              Registro fotografico del vehiculo
            </div>
            <div className="module-stats">
              {vehicle.photos?.length || 0}/13 fotos capturadas
            </div>
            <button className="module-button">
              Ver Detalles
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
