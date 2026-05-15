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
 * VehicleDetailView - Vista profesional de detalles del vehículo
 * Muestra:
 * 1. Información básica (izquierda) + Historial (derecha)
 * 2. Módulos de documentos, mantenimiento, gasolina y fotografías
 */
export default function VehicleDetailView({
  vehicle,
  vehicleId,
  onDocumentsClick,
  onMaintenanceClick,
  onGasolineClick,
  onParametersClick,
  onPhotosClick
}) {
  const [activeSection, setActiveSection] = useState(null);
  const operationParameters = vehicle.operationParameters || null;
  const configuredParametersCount = operationParameters
    ? [
        operationParameters.capacidad_tanque_litros,
        operationParameters.rendimiento_objetivo_km_l,
        operationParameters.porcentaje_precaucion_menor,
        operationParameters.porcentaje_precaucion_mayor,
        operationParameters.tiempo_cambio_aceite_meses,
        operationParameters.aviso_previo_tiempo_aceite_meses,
        operationParameters.distancia_cambio_aceite_km,
        operationParameters.aviso_previo_cambio_aceite_km
      ].filter((value) => value !== null && value !== undefined && value !== '').length
    : 0;

  const handleModuleClick = (module) => {
    setActiveSection(module);
    if (module === 'documents') onDocumentsClick?.();
    else if (module === 'maintenance') onMaintenanceClick?.();
    else if (module === 'gasoline') onGasolineClick?.();
    else if (module === 'parameters') onParametersClick?.();
    else if (module === 'photos') onPhotosClick?.();
  };

  return (
    <div className="vehicle-detail-view">
      <div className="detail-main-layout">
        <div className="detail-left-column">
          <div className="info-section">
            <h2 className="info-title">
              <span className="icon">ℹ️</span>
              Información Básica del Vehículo
            </h2>

            <div className="vehicle-summary-strip">
              <div className="summary-card">
                <span className="summary-label">Placa</span>
                <strong className="summary-value">{vehicle.placa}</strong>
              </div>
              <div className="summary-card">
                <span className="summary-label">Propietario</span>
                <strong className="summary-value">{vehicle.propietario_nombre || '-'}</strong>
              </div>
              <div className="summary-card">
                <span className="summary-label">Estado</span>
                <span className={`status-badge status-badge-large ${getStatusBadgeClass(vehicle.estado)}`}>
                  <span>{formatStatus(vehicle.estado)}</span>
                </span>
              </div>
              <div className="summary-card">
                <span className="summary-label">Capacidad</span>
                <strong className="summary-value">
                  {vehicle.capacidad_kg ? `${vehicle.capacidad_kg.toLocaleString()} kg` : '-'}
                </strong>
              </div>
            </div>

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
                      <span className="detail-value-text">{vehicle.placa}</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="label">Número de Serie</td>
                    <td className="value">
                      <span className="detail-value-text">{vehicle.numero_serie}</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="label">Marca</td>
                    <td className="value">{vehicle.marca}</td>
                  </tr>
                  <tr>
                    <td className="label">Modelo (Año)</td>
                    <td className="value">{vehicle.modelo}</td>
                  </tr>
                  <tr>
                    <td className="label">Color</td>
                    <td className="value">
                      <span className="detail-value-text">{vehicle.color || '-'}</span>
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
                        <span>{formatStatus(vehicle.estado)}</span>
                      </span>
                    </td>
                  </tr>
                  {vehicle.descripcion && (
                    <tr>
                      <td className="label">Descripción</td>
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
          Módulos de Información
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
              Permisos, licencias y documentos del vehículo
            </div>
            <div className="module-stats">
              {vehicle.documents?.length || 0} documentos registrados
            </div>
            <button className="module-button">
              Ver detalles
            </button>
          </div>

          <div
            className="module-card maintenance"
            onClick={() => handleModuleClick('maintenance')}
            data-active={activeSection === 'maintenance'}
          >
            <div className="module-header">
              <span className="module-icon">🛠️</span>
              <span>Mantenimiento</span>
            </div>
            <div className="module-info">
              Elementos de seguridad, checklist y servicios realizados
            </div>
            <div className="module-stats">
              {vehicle.safetyElements?.length || 0}/11 elementos completados
            </div>
            <button className="module-button">
              Ver detalles
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
              Ver detalles
            </button>
          </div>

          <div
            className="module-card parameters"
            onClick={() => handleModuleClick('parameters')}
            data-active={activeSection === 'parameters'}
          >
            <div className="module-header">
              <span className="module-icon">⚙️</span>
              <span>Parámetros</span>
            </div>
            <div className="module-info">
              Limites de tanque, rendimiento esperado y alertas preventivas de cambio de aceite
            </div>
            <div className="module-stats">
              {configuredParametersCount}/8 parametros configurados
            </div>
            <button className="module-button">
              Ver detalles
            </button>
          </div>

          <div
            className="module-card photos"
            onClick={() => handleModuleClick('photos')}
            data-active={activeSection === 'photos'}
          >
            <div className="module-header">
              <span className="module-icon">📸</span>
              <span>Fotografías</span>
            </div>
            <div className="module-info">
              Registro fotográfico del vehículo
            </div>
            <div className="module-stats">
              {vehicle.photos?.length || 0}/13 fotos capturadas
            </div>
            <button className="module-button">
              Ver detalles
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
