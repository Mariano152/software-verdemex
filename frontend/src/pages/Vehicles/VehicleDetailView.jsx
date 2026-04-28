import { useState } from 'react';
import ExpedienteSection from './Sections/ExpedienteSection';
import './VehicleDetailView.css';

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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'activo': return '🟢';
      case 'inactivo': return '⚫';
      case 'en_mantenimiento': return '🔧';
      case 'disponible': return '🚗';
      default: return '❓';
    }
  };

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
                      <span className="color-box" style={{ backgroundColor: vehicle.color || '#ccc' }}>
                        {vehicle.color || '-'}
                      </span>
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
                      <span className="status-badge">
                        {getStatusIcon(vehicle.estado)} {vehicle.estado?.charAt(0).toUpperCase() + vehicle.estado?.slice(1)}
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
              👁️ Ver Detalles
            </button>
          </div>

          <div
            className="module-card maintenance"
            onClick={() => handleModuleClick('maintenance')}
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
              👁️ Ver Detalles
            </button>
          </div>

          <div
            className="module-card gasoline"
            onClick={() => handleModuleClick('gasoline')}
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
              👁️ Ver Detalles
            </button>
          </div>

          <div
            className="module-card photos"
            onClick={() => handleModuleClick('photos')}
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
              👁️ Ver Detalles
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
