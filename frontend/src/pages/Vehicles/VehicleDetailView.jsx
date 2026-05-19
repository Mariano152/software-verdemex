import { useState } from 'react';
import ExpedienteSection from './Sections/ExpedienteSection';
import { getVehicleIdentifier, getVehicleSecondaryLabel } from '../../utils/vehicleLabels';
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

  const modules = [
    {
      key: 'documents',
      cardClass: 'documents',
      icon: '📄',
      eyebrow: 'Control documental',
      title: 'Documentos',
      description: 'Permisos, licencias y documentos del vehiculo',
      stats: `${vehicle.documents?.length || 0} documentos registrados`
    },
    {
      key: 'maintenance',
      cardClass: 'maintenance',
      icon: '🛠',
      eyebrow: 'Revision operativa',
      title: 'Mantenimiento',
      description: 'Elementos de seguridad, checklist y servicios realizados',
      stats: `${vehicle.safetyElements?.length || 0}/11 elementos completados`
    },
    {
      key: 'gasoline',
      cardClass: 'gasoline',
      icon: '⛽',
      eyebrow: 'Consumo y cargas',
      title: 'Gasolina',
      description: 'Historial de cargas, litros comprados y gasto mensual',
      stats: `${vehicle.gasolineRecords?.length || 0} cargas registradas`
    },
    {
      key: 'parameters',
      cardClass: 'parameters',
      icon: '⚙',
      eyebrow: 'Ajustes de unidad',
      title: 'Parametros',
      description: 'Limites de tanque, rendimiento esperado y alertas preventivas de cambio de aceite',
      stats: `${configuredParametersCount}/8 parametros configurados`
    },
    {
      key: 'photos',
      cardClass: 'photos',
      icon: '📷',
      eyebrow: 'Memoria visual',
      title: 'Fotografias',
      description: 'Registro fotografico del vehiculo',
      stats: `${vehicle.photos?.length || 0}/13 fotos capturadas`
    }
  ];

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
              <span className="icon">i</span>
              Informacion Basica del Vehiculo
            </h2>

            <div className="vehicle-summary-strip">
              <div className="summary-card">
                <span className="summary-label">Numero Economico</span>
                <strong className="summary-value">{getVehicleIdentifier(vehicle)}</strong>
              </div>
              <div className="summary-card">
                <span className="summary-label">Unidad</span>
                <strong className="summary-value">{getVehicleSecondaryLabel(vehicle)}</strong>
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
                    <td className="label">Numero Economico</td>
                    <td className="value">{vehicle.numero_economico || '-'}</td>
                  </tr>
                  <tr>
                    <td className="label">Tipo de Carro</td>
                    <td className="value">{vehicle.tipo_carro || '-'}</td>
                  </tr>
                  <tr>
                    <td className="label">Propietario</td>
                    <td className="value">{vehicle.propietario_nombre || '-'}</td>
                  </tr>
                  <tr>
                    <td className="label">Placa</td>
                    <td className="value">
                      <span className="detail-value-text">{vehicle.placa || '-'}</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="label">Numero de Serie</td>
                    <td className="value">
                      <span className="detail-value-text">{vehicle.numero_serie || '-'}</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="label">Marca</td>
                    <td className="value">{vehicle.marca || '-'}</td>
                  </tr>
                  <tr>
                    <td className="label">Modelo (Ano)</td>
                    <td className="value">{vehicle.modelo || '-'}</td>
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
          <span className="icon">+</span>
          Modulos de Informacion
        </h2>

        <div className="modules-grid">
          {modules.map((module) => (
            <div
              key={module.key}
              className={`module-card ${module.cardClass}`}
              onClick={() => handleModuleClick(module.key)}
              data-active={activeSection === module.key}
            >
              <div className="module-topbar">
                <div className="module-art" aria-hidden="true">
                  <span className="module-art-icon">{module.icon}</span>
                </div>
                <div className="module-copy">
                  <span className="module-eyebrow">{module.eyebrow}</span>
                  <div className="module-header">
                    <span>{module.title}</span>
                  </div>
                </div>
              </div>

              <div className="module-info">
                {module.description}
              </div>
              <div className="module-stats">
                {module.stats}
              </div>
              <button className="module-button">
                Ver detalles
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
